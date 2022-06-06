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

/**
 * @param {class} Coroutine
 * @param {CallStack} callStack
 * @constructor
 */
function CoroutineFactory(Coroutine, callStack) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {class}
     */
    this.Coroutine = Coroutine;
}

_.extend(CoroutineFactory.prototype, {
    /**
     * Creates a new Coroutine.
     *
     * @returns {Coroutine}
     */
    createCoroutine: function () {
        var factory = this,
            coroutine = new factory.Coroutine(factory.callStack),
            currentScope = factory.callStack.getCurrentScope();

        if (currentScope) {
            currentScope.updateCoroutine(coroutine);
        }

        return coroutine;
    }
});

module.exports = CoroutineFactory;
