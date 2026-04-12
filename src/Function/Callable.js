/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception,
    FFIResult = require('../FFI/Result'),
    Reference = require('../Reference/Reference'),
    Variable = require('../Variable').sync();

/**
 * Wraps a native JavaScript function, handling the PHP call stack and scoping.
 *
 * @param {ScopeFactory} scopeFactory
 * @param {CallFactory} callFactory
 * @param {ValueFactory} valueFactory
 * @param {CallStack} callStack
 * @param {Flow} flow
 * @param {NamespaceScope} namespaceScope
 * @param {Class|null} currentClass Used by e.g., `self::`.
 * @param {ObjectValue|null} currentObject
 * @param {Class|null} staticClass Used by e.g., `static::`.
 * @param {FunctionSpec|OverloadedFunctionSpec} functionSpec
 * @constructor
 */
function Callable(
    scopeFactory,
    callFactory,
    valueFactory,
    callStack,
    flow,
    namespaceScope,
    currentClass,
    currentObject,
    staticClass,
    functionSpec
) {
    /**
     * @type {CallFactory}
     */
    this.callFactory = callFactory;
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {Class|null}
     */
    this.currentClass = currentClass;
    /**
     * @type {ObjectValue|null}
     */
    this.currentObject = currentObject;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FunctionSpec|OverloadedFunctionSpec}
     */
    this.functionSpec = functionSpec;
    /**
     * @type {boolean}
     */
    this.isPHPCoreWrapped = true;
    /**
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
    /**
     * @type {ScopeFactory}
     */
    this.scopeFactory = scopeFactory;
    /**
     * @type {Class|null}
     */
    this.staticClass = staticClass;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(Callable.prototype, {
    /**
     * Calls the callable.
     *
     * @param {Reference[]|Value[]|Variable[]=} positionalArguments
     * @param {Object.<string, Reference|Value|Variable>|null=} namedArguments
     * @param {ObjectValue|null=} thisObject
     * @param {Class|null=} newStaticClass Allow an explicit static class to be specified e.g., by a Closure.
     * @returns {ChainableInterface<Value>}
     */
    call: function (positionalArguments, namedArguments, thisObject, newStaticClass) {
        var callable = this,
            functionSpec,
            func,
            scope,
            result;

        positionalArguments ??= []; // jshint ignore:line
        namedArguments ??= null; // jshint ignore:line
        functionSpec = callable.functionSpec.resolveFunctionSpec(positionalArguments.length);
        func = functionSpec.getFunction();
        newStaticClass = newStaticClass ?? callable.staticClass;
        thisObject = thisObject ?? callable.currentObject;

        /**
         * Handles coercion and validates the result of the function call.
         *
         * @param {Reference|Value|Variable|*} result
         * @returns {ChainableInterface<Reference|Value|Variable>}
         */
        function finishCall(result) {
            /** @var {Reference|Value|Variable} */
            var resultReference;

            if ((result instanceof Reference) || (result instanceof Variable)) {
                // Result is a Reference, resolve to a value if needed
                resultReference = functionSpec.isReturnByReference() ?
                    result :
                    result.getValue();
            } else if (!(result instanceof FFIResult)) {
                // Result is either a Value or native value needing coercion
                // (see below for note on FFIResults).
                resultReference = callable.valueFactory.coerce(result);
            }

            if (result instanceof FFIResult) {
                // FFIResults must only be resolved after the call has been popped
                resultReference = result.resolve();
            }

            return resultReference.next(function (presentResultReference) {
                // Coerce return value or reference as required, capturing the value for later validation.
                // Note that the coerced result for by-value functions will be written back to resultReference.
                return functionSpec.coerceReturnReference(presentResultReference)
                    .next(function (resultValue) {
                        // Check the return value against the return type (if any). If the caller
                        // is in weak type-checking mode, the value will have been coerced if possible above.
                        return functionSpec.validateReturnReference(presentResultReference, resultValue);
                    });
            });
        }

        /**
         * Performs the actual call, returning a Value or Future
         * to be resolved on success or rejected on error.
         *
         * @returns {Future|Value}
         */
        function doCall() {
            return callable.flow
                .maybeFuturise(
                    function () {
                        if (functionSpec.isUserland()) {
                            return func();
                        }

                        // Native functions expect arguments to be provided natively as normal.
                        return func.apply(scope, positionalArguments);
                    },
                    function (pause, onResume) {
                        if (!functionSpec.isUserland()) {
                            throw new Exception(
                                'Callable :: A built-in function enacted a Pause, did you mean to return a Future instead?'
                            );
                        }

                        onResume(doCall);
                    }
                );
        }

        if (!callable.valueFactory.isValue(thisObject)) {
            thisObject = null;
        }

        /*
         * Coerce parameter arguments as required, capturing all values for later validation.
         *
         * Coerced arguments for by-value parameters will be written back to `positionalArguments`.
         *
         * Any arguments that are references returning Futures will be resolved.
         */
        result = functionSpec.coercePositionalArguments(positionalArguments)
            .next(function (argValues) {
                // Fill in any named arguments given after the positional ones.
                return namedArguments ?
                    functionSpec.coerceNamedArguments(namedArguments, positionalArguments, argValues) :
                    argValues;
            })
            .next(function (argValues) {
                var call;

                scope = callable.scopeFactory.create(callable.currentClass, callable, thisObject);
                call = callable.callFactory.create(
                    scope,
                    callable.namespaceScope,
                    // Note that the resolved argument values are stored against the call and not
                    // any references passed in, so we have the actual argument used at the time.
                    argValues,
                    newStaticClass
                );

                // Push the call onto the stack.
                callable.callStack.push(call);

                // Now validate the arguments at this point (coercion was done earlier)
                // - if any error is raised, then the call will still be popped off
                //   by the `finally` clause below.
                return functionSpec.validateArguments(positionalArguments, argValues)
                    .next(function () {
                        /*
                         * Now populate any optional arguments that were omitted with their default values.
                         *
                         * Note that default args could be async and cause a pause,
                         *     e.g., if a default value is a constant of an asynchronously autoloaded class.
                         */
                        return functionSpec.populateDefaultArguments(positionalArguments);
                    })
                    .next(function (populatedArguments) {
                        // Note that by this point all arguments will have been resolved to present values
                        // (i.e., any Futures will have been awaited and resolved).
                        positionalArguments = populatedArguments;

                        if (functionSpec.isUserland()) {
                            // Userland functions' parameter arguments have variables declared
                            // in the function call's scope and then references or values loaded.
                            functionSpec.loadArguments(positionalArguments, scope);
                        }

                        return doCall();
                    })
                    .next(finishCall)
                    .finally(function () {
                        // Once the call completes, whether with a result or a thrown error/exception,
                        // pop the call off of the stack.

                        // TODO: This was previously not being done if an error occurred during arg defaults population, cover with unit test
                        callable.callStack.pop();
                    });
            });

        if (!functionSpec.isReturnByReference()) {
            // Function is return-by-value, so ensure we have a value as the result.
            result = result.asValue();
        }

        return result;
    }
});

module.exports = Callable;
