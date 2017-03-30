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
     * @param {ScopeFactory} scopeFactory
     * @param {CallFactory} callFactory
     * @param {ValueFactory} valueFactory
     * @param {CallStack} callStack
     * @constructor
     */
    function FunctionFactory(scopeFactory, callFactory, valueFactory, callStack) {
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
         * @param {NamespaceScope|null} namespaceScope
         * @param {Class|null} currentClass Used by eg. self::
         * @param {Function} func
         * @param {string|null} name
         * @param {ObjectValue|null} currentObject
         * @param {Class|null} staticClass Used by eg. static::
         * @returns {Function}
         */
        create: function (namespaceScope, currentClass, func, name, currentObject, staticClass) {
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

                    scope = factory.scopeFactory.create(namespaceScope, currentClass, wrapperFunc, thisObject);
                    call = factory.callFactory.create(scope, namespaceScope, args, newStaticClass);

                    // Push the call onto the stack
                    factory.callStack.push(call);

                    try {
                        result = func.apply(scope, args);
                    } finally {
                        // Pop the call off the stack when done
                        factory.callStack.pop();
                    }

                    return result;
                };

            wrapperFunc.funcName = name || namespaceScope.getNamespacePrefix() + '{closure}';
            wrapperFunc.isPHPCoreWrapped = true;

            return wrapperFunc;
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
