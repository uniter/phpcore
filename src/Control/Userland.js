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
    Pause = require('./Pause'),
    Promise = require('lie');

/**
 * @param {CallStack} callStack
 * @param {ControlScope} controlScope
 * @param {ValueFactory} valueFactory
 * @param {OpcodePool} opcodePool
 * @param {string} mode
 * @constructor
 */
function Userland(
    callStack,
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

        if (userland.mode === 'async') {
            return new Promise(function (resolve, reject) {
                function run() {
                    try {
                        resolve(executor());
                    } catch (error) {
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
                }

                run();
            });
        }

        return executor();
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
