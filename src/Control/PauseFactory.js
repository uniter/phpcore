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
    Exception = phpCommon.Exception;

/**
 * @param {class} Pause
 * @param {CallStack} callStack
 * @param {ControlFactory} controlFactory
 * @param {ControlScope} controlScope
 * @param {string} mode
 * @constructor
 */
function PauseFactory(Pause, callStack, controlFactory, controlScope, mode) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ControlFactory}
     */
    this.controlFactory = controlFactory;
    /**
     * @type {ControlScope}
     */
    this.controlScope = controlScope;
    /**
     * @type {string}
     */
    this.mode = mode;
    /**
     * @type {class}
     */
    this.Pause = Pause;
}

_.extend(PauseFactory.prototype, {
    /**
     * Creates a new control Pause
     *
     * @param {Function} executor
     * @returns {Pause}
     */
    createPause: function (executor) {
        var factory = this;

        if (factory.mode !== 'async') {
            throw new Exception('PauseFactory.createPause() :: Cannot pause outside async mode');
        }

        return new factory.Pause(
            factory.callStack,
            factory.controlScope,
            factory.controlFactory.createSequence(),
            executor
        );
    }
});

module.exports = PauseFactory;
