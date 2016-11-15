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
    slice = [].slice;

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
     * @param {Class|null} currentClass
     * @param {Function} func
     * @param {string|null} name
     * @param {ObjectValue|null} currentObject
     * @returns {Function}
     */
    create: function (namespaceScope, currentClass, func, name, currentObject) {
        var factory = this,
            wrapperFunc = function () {
                var args = slice.call(arguments),
                    thisObject = currentObject || this,
                    scope,
                    call,
                    result;

                if (!factory.valueFactory.isValue(thisObject)) {
                    thisObject = null;
                }

                scope = factory.scopeFactory.create(namespaceScope, currentClass, wrapperFunc, thisObject);
                call = factory.callFactory.create(scope, namespaceScope, args);

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

        return wrapperFunc;
    }
});

module.exports = FunctionFactory;
