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
    require('microdash')
], function (
    _
) {
    var slice = [].slice;

    /**
     * @param {class} MethodSpec
     * @param {ScopeFactory} scopeFactory
     * @param {CallFactory} callFactory
     * @param {ValueFactory} valueFactory
     * @param {CallStack} callStack
     * @constructor
     */
    function FunctionFactory(MethodSpec, scopeFactory, callFactory, valueFactory, callStack) {
        /**
         * @type {CallFactory}
         */
        this.callFactory = callFactory;
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
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
                wrapperFunc = function () {
                    var args = slice.call(arguments),
                        thisObject = currentObject || this,
                        scope,
                        call,
                        newStaticClass = null,
                        result;

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

                    // Coerce parameter arguments as required
                    args = functionSpec.coerceArguments(args);

                    scope = factory.scopeFactory.create(currentClass, wrapperFunc, thisObject);
                    call = factory.callFactory.create(scope, namespaceScope, args, newStaticClass);

                    // Push the call onto the stack
                    factory.callStack.push(call);

                    try {
                        // Now validate the arguments at this point (coercion was done earlier)
                        // - if any error is raised then the call will still be popped off
                        //   by the finally clause below
                        functionSpec.validateArguments(args);

                        // Now populate any optional arguments that were omitted with their default values
                        args = functionSpec.populateDefaultArguments(args);

                        result = func.apply(scope, args);

                        // TODO: Coerce the result as needed (if the PHP function has a return type defined)
                    } finally {
                        // Pop the call off the stack when done
                        factory.callStack.pop();
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
