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
    Pause = require('./Pause'),
    Promise = require('lie');

/**
 * @param {CallStack} callStack
 * @param {ControlBridge} controlBridge
 * @param {ControlScope} controlScope
 * @param {ValueFactory} valueFactory
 * @param {OpcodePool} opcodePool
 * @param {string} mode
 * @constructor
 */
function Userland(
    callStack,
    controlBridge,
    controlScope,
    valueFactory,
    opcodePool,
    mode
) {
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
     * @type {string}
     */
    this.mode = mode;
    /**
     * @type {OpcodePool}
     */
    this.opcodePool = opcodePool;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(Userland.prototype, {
    /**
     * Enters the top-level of userland code (eg. a module)
     *
     * @param {Function} executor
     * @returns {Promise|*}
     */
    enterTopLevel: function (executor) {
        var userland = this;

        /**
         * A pause or error occurred. Note that the error thrown could be a Future(Value),
         * in which case we need to yield to it so that a pause occurs if required.
         *
         * @param {Error|Future|FutureValue|Pause} error
         * @param {Function} reject
         * @param {Function} run
         */
        function handlePauseOrError(error, reject, run) {
            if (userland.controlBridge.isFuture(error)) {
                // Special case: the thrown error is itself a Future(Value), so we need
                // to yield to it to either resolve it to the eventual error or pause.
                try {
                    error = error.yield();
                } catch (furtherError) {
                    handlePauseOrError(furtherError, reject, run);
                    return;
                }
            }

            if (error instanceof Pause) {
                error.next(
                    function (/* result */) {
                        /*
                         * Note that the result passed here for the opcode we are about to resume
                         * by re-calling the userland function has already been provided (see Pause),
                         * so the result argument passed to this callback may be ignored.
                         */

                        return run();
                    },
                    function (/* error */) {
                        /*
                         * Note that the error passed here for the opcode we are about to throwInto
                         * by re-calling the userland function has already been provided (see Pause),
                         * so the result argument passed to this callback may be ignored.
                         */

                        return run();
                    }
                );

                userland.controlScope.markPaused(error); // Call stack should be unwound by this point

                return;
            }

            reject(error);
        }

        if (userland.mode === 'async') {
            return new Promise(function (resolve, reject) {
                function run() {
                    try {
                        resolve(executor());
                    } catch (error) {
                        handlePauseOrError(error, reject, run);
                    }
                }

                run();
            });
        }

        try {
            return executor();
        } catch (error) {
            handlePauseOrError(error, function (error) {
                throw error;
            }, function () {
                throw new Exception('Cannot resume in sync mode');
            });
        }
    },

    /**
     * Enters isolated userland code, eg. a default value provider
     * such as a default class property value provider function
     *
     * @param {Function} executor
     * @param {NamespaceScope=} namespaceScope
     * @returns {Future|FutureValue|Value}
     */
    enterIsolated: function (executor, namespaceScope) {
        var userland = this,
            trace = userland.callStack.getCurrentTrace(),
            isolatedOpcode = userland.opcodePool.provideIsolatedOpcode();

        if (namespaceScope) {
            namespaceScope.enter();
        }

        trace.enterOpcode(isolatedOpcode);

        return userland.valueFactory.maybeFuturise(executor)
            .finally(function () {
                trace.leaveOpcode(isolatedOpcode);

                if (namespaceScope) {
                    namespaceScope.leave();
                }
            });
    }
});

module.exports = Userland;
