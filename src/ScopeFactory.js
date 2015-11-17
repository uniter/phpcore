/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

function ScopeFactory(Scope, callStack, valueFactory) {
    this.callStack = callStack;
    this.functionFactory = null;
    this.Scope = Scope;
    this.valueFactory = valueFactory;
}

_.extend(ScopeFactory.prototype, {
    create: function (namespace, currentClass, currentFunction, thisObject) {
        var factory = this;

        return new factory.Scope(
            factory.callStack,
            factory.functionFactory,
            factory.valueFactory,
            namespace || null,
            currentClass || null,
            currentFunction || null,
            thisObject || null
        );
    },

    setFunctionFactory: function (functionFactory) {
        this.functionFactory = functionFactory;
    }
});

module.exports = ScopeFactory;
