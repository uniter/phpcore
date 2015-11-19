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

function FunctionFactory(scopeFactory, callFactory, valueFactory, callStack) {
    this.callFactory = callFactory;
    this.callStack = callStack;
    this.scopeFactory = scopeFactory;
    this.valueFactory = valueFactory;
}

_.extend(FunctionFactory.prototype, {
    create: function (namespace, currentClass, currentScope, func, name) {
        var factory = this,
            wrapperFunc = function () {
                var thisObject = this,
                    scope,
                    call,
                    result;

                if (!factory.valueFactory.isValue(thisObject)) {
                    thisObject = null;
                }

                scope = factory.scopeFactory.create(namespace, currentClass, wrapperFunc, thisObject);
                call = factory.callFactory.create(scope);

                // Push the call onto the stack
                factory.callStack.push(call);

                try {
                    result = func.apply(scope, slice.call(arguments));
                } finally {
                    // Pop the call off the stack when done
                    factory.callStack.pop();
                }

                return result;
            };

        wrapperFunc.funcName = name || namespace.getPrefix() + '{closure}';
        wrapperFunc.scopeWhenCreated = currentScope;

        return wrapperFunc;
    }
});

module.exports = FunctionFactory;
