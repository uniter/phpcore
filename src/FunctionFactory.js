/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash'),
    require('./FFI/Result'),
    require('./Control/Pause'),
    require('./Reference/Reference'),
    require('./Variable')
], function (
    _,
    FFIResult,
    Pause,
    Reference,
    Variable
) {
    var slice = [].slice;

    /**
     * @param {class} MethodSpec
     * @param {ScopeFactory} scopeFactory
     * @param {CallFactory} callFactory
     * @param {ValueFactory} valueFactory
     * @param {CallStack} callStack
     * @param {Flow} flow
     * @param {ControlBridge} controlBridge
     * @param {ControlScope} controlScope
     * @constructor
     */
    function FunctionFactory(
        MethodSpec,
        scopeFactory,
        callFactory,
        valueFactory,
        callStack,
        flow,
        controlBridge,
        controlScope
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
         * @type {ControlBridge}
         */
        this.controlBridge = controlBridge;
        /**
         * @type {ControlScope}
         */
        this.controlScope = controlScope;
        /**
         * @type {Flow}
         */
        this.flow = flow;
        /**
         * @type {class}
         */
        this.MethodSpec = MethodSpec;
        /**
         * @type {Class|null}
         */
        this.newStaticClassForNextCall = null;
        /**
         * @type {ScopeFactory}
         */
        this.scopeFactory = scopeFactory;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(FunctionFactory.prototype, {
        /**
         * Wraps the specified function in another that handles the PHP call stack and scoping
         *
         * @param {NamespaceScope} namespaceScope
         * @param {Class|null} currentClass Used by eg. self::
         * @param {Function} func
         * @param {string|null} name
         * @param {ObjectValue|null} currentObject
         * @param {Class|null} staticClass Used by eg. static::
         * @param {FunctionSpec} functionSpec
         * @returns {Function}
         */
        create: function (namespaceScope, currentClass, func, name, currentObject, staticClass, functionSpec) {
            var factory = this,
                /**
                 * Wraps a function exposed to PHP-land.
                 *
                 * @returns {Future|Value}
                 */
                wrapperFunc = function () {
                    var argReferences = slice.call(arguments),
                        thisObject = currentObject || this,
                        scope,
                        call,
                        newStaticClass = null,
                        result;

                    /**
                     * Handles coercion and validation of the result of the function call.
                     *
                     * @param {Reference|Value|Variable|*} result
                     * @returns {Future<Reference|Value|Variable>}
                     */
                    function finishCall(result) {
                        /** @var {Reference|Value|Variable} */
                        var resultReference,
                            /** @var {Value} */
                            resultValue;

                        if ((result instanceof Reference) || (result instanceof Variable)) {
                            // Result is a Reference, resolve to a value if needed
                            resultReference = functionSpec.isReturnByReference() ?
                                result :
                                factory.valueFactory.coerce(result);
                        } else if (!(result instanceof FFIResult)) {
                            // Result is either a Value or native value needing coercion
                            // (see below for note on FFIResults)
                            resultReference = factory.valueFactory.coerce(result);
                        }

                        if (result instanceof FFIResult) {
                            // FFIResults must only be resolved after the call has been popped
                            resultReference = result.resolve();
                        }

                        // Coerce return value or reference as required, capturing the value for later validation.
                        // Note that the coerced result for by-value functions will be written back to resultReference.
                        resultValue = functionSpec.coerceReturnReference(resultReference);

                        // Check the return value against the return type (if any). If the caller
                        // is in weak type-checking mode, the value will have been coerced if possible above.
                        return functionSpec.validateReturnReference(resultReference, resultValue);
                    }

                    /**
                     * Performs the actual call, returning a Value or Future
                     * to be resolved on success or rejected on error.
                     *
                     * @returns {Future|Value}
                     */
                    function doCall() {
                        return factory.flow
                            .maybeFuturise(
                                function () {
                                    if (functionSpec.isUserland()) {
                                        // Userland functions' parameter arguments have variables declared
                                        // in the function call's scope and then references or values loaded.
                                        functionSpec.loadArguments(argReferences, scope);

                                        return func();
                                    }

                                    // Native functions expect arguments to be provided natively as normal.
                                    return func.apply(scope, argReferences);
                                },
                                function (pause) {
                                    pause.next(
                                        function (result) {
                                            /*
                                             * Note that the result passed here for the opcode we are about to resume
                                             * by re-calling the userland function has already been provided (see Pause),
                                             * so the result argument passed to this callback may be ignored.
                                             *
                                             * If the pause resulted in an error, then we also want to re-call
                                             * the function in order to resume with a throwInto at the correct opcode
                                             * (see catch handler below).
                                             */
                                            if (functionSpec.isUserland()) {
                                                return doCall();
                                            }

                                            return finishCall(result);
                                        },
                                        function (error) {
                                            /*
                                             * Note that the error passed here for the opcode we are about to throwInto
                                             * by re-calling the userland function has already been provided (see Pause),
                                             * so the error argument passed to this callback may be ignored.
                                             *
                                             * Similar to the above, we want to re-call the function in order to resume
                                             * with a throwInto at the correct opcode.
                                             */
                                            if (functionSpec.isUserland()) {
                                                return doCall();
                                            }

                                            throw error;
                                        }
                                    );
                                }
                            )
                            .next(finishCall);
                    }

                    if (factory.newStaticClassForNextCall !== null) {
                        newStaticClass = factory.newStaticClassForNextCall;
                        factory.newStaticClassForNextCall = null;
                    } else if (staticClass) {
                        // Allow an explicit static class to be specified, eg. by a Closure
                        newStaticClass = staticClass;
                    }

                    if (!factory.valueFactory.isValue(thisObject)) {
                        thisObject = null;
                    }

                    /*
                     * Coerce parameter arguments as required, capturing all values for later validation.
                     *
                     * Coerced arguments for by-value parameters will be written back to argReferences.
                     *
                     * Any arguments that are references returning FutureValues will be resolved.
                     */
                    result = functionSpec.coerceArguments(argReferences)
                        .next(function (argValues) {
                            scope = factory.scopeFactory.create(currentClass, wrapperFunc, thisObject);
                            call = factory.callFactory.create(
                                scope,
                                namespaceScope,
                                // Note that the resolved argument values are stored against the call and not
                                // any references passed in, so we have the actual argument used at the time.
                                argValues,
                                newStaticClass
                            );

                            // TODO: Remove NamespaceScope concept, instead handling at compile time.
                            namespaceScope.enter();

                            // Push the call onto the stack.
                            factory.callStack.push(call);

                            // Now validate the arguments at this point (coercion was done earlier)
                            // - if any error is raised then the call will still be popped off
                            //   by the finally clause below.
                            return functionSpec.validateArguments(argReferences, argValues);
                        })
                        .next(function () {
                            /*
                             * Now populate any optional arguments that were omitted with their default values.
                             *
                             * Note that default args could be async and cause a pause,
                             *     eg. if a default value is a constant of an asynchronously autoloaded class.
                             */
                            return functionSpec.populateDefaultArguments(argReferences);
                        })
                        .next(function (populatedArguments) {
                            // Note that by this point all arguments will have been resolved to present values
                            // (ie. any FutureValues will have been awaited and resolved).
                            argReferences = populatedArguments;

                            return doCall();
                        })
                        .finally(function () {
                            // Once the call completes, whether with a result or a thrown error/exception,
                            // pop the call off of the stack

                            // TODO: This was previously not being done if an error occurred during arg defaults population, cover with unit test
                            factory.callStack.pop();

                            // TODO: Remove NamespaceScope...
                            namespaceScope.leave();
                        });

                    if (!functionSpec.isReturnByReference()) {
                        // Function is return-by-value, so ensure we have a value as the result.
                        result = result.asValue();
                    }

                    return result;
                };

            wrapperFunc.functionSpec = functionSpec;
            wrapperFunc.isPHPCoreWrapped = true;
            wrapperFunc.originalFunc = func;

            return wrapperFunc;
        },

        /**
         * Creates a new MethodSpec, that describes the specified method of a class
         *
         * @TODO: Replace with FunctionSpec instead?
         *
         * @param {Class} originalClass The original class checked against (eg. a derived class for an inherited method)
         * @param {Class} classObject The class the method is actually defined on (may be an ancestor)
         * @param {string} methodName
         * @param {Function} method
         */
        createMethodSpec: function (originalClass, classObject, methodName, method) {
            return new this.MethodSpec(originalClass, classObject, methodName, method);
        },

        /**
         * Specifies the class to use as the static:: class for the next call
         * to the specified wrapped function
         *
         * @param {Function} func
         * @param {Class} newStaticClass
         */
        setNewStaticClassIfWrapped: function (func, newStaticClass) {
            if (!func.isPHPCoreWrapped) {
                return;
            }

            this.newStaticClassForNextCall = newStaticClass;
        }
    });

    return FunctionFactory;
}, {strict: true});
