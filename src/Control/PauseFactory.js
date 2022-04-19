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
 * @param {ControlScope} controlScope
 * @param {string} mode
 * @constructor
 */
function PauseFactory(Pause, callStack, controlScope, mode) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ControlScope}
     */
    this.controlScope = controlScope;
    /**
     * @type {FutureFactory|null}
     */
    this.futureFactory = null;
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
     * Creates a new control Pause.
     *
     * @param {Function} executor
     * @returns {Pause}
     */
    createPause: function (executor) {
        var factory = this,
            future,
            resolveFuture,
            rejectFuture;

        if (factory.mode !== 'async') {
            throw new Exception('PauseFactory.createPause() :: Cannot pause outside async mode');
        }

        future = factory.futureFactory.createFuture(function (resolve, reject) {
            resolveFuture = resolve;
            rejectFuture = reject;
        });

        return new factory.Pause(
            factory.callStack,
            factory.controlScope,
            future,
            resolveFuture,
            rejectFuture,
            executor
        );
    },

    /**
     * Sets the FutureFactory service (solves a circular dependency issue).
     *
     * @param {FutureFactory} futureFactory
     */
    setFutureFactory: function (futureFactory) {
        this.futureFactory = futureFactory;
    }
});

module.exports = PauseFactory;
