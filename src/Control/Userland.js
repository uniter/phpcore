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
 * @param {CallStack} callStack
 * @param {ControlFactory} controlFactory
 * @param {ControlBridge} controlBridge
 * @param {ControlScope} controlScope
 * @param {NamespaceContext} namespaceContext
 * @param {Flow} flow
 * @param {ValueFactory} valueFactory
 * @param {OpcodePool} opcodePool
 * @param {string} mode
 * @constructor
 */
function Userland(
    callStack,
    controlFactory,
    controlBridge,
    controlScope,
    namespaceContext,
    flow,
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
     * @type {ControlFactory}
     */
    this.controlFactory = controlFactory;
    /**
     * @type {ControlScope}
     */
    this.controlScope = controlScope;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {string}
     */
    this.mode = mode;
    /**
     * @type {NamespaceContext}
     */
    this.namespaceContext = namespaceContext;
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
     * Enters isolated userland code, e.g. a default value provider
     * such as a default class property value provider function.
     *
     * @param {Function} executor
     * @param {NamespaceScope=} namespaceScope
     * @returns {ChainableInterface}
     */
    enterIsolated: function (executor, namespaceScope) {
        var userland = this,
            call = userland.callStack.getCurrent(),
            isolatedTrace = userland.controlFactory.createTrace(),
            originalTrace;

        if (namespaceScope) {
            userland.namespaceContext.enterNamespaceScope(namespaceScope);
        }

        originalTrace = call.setTrace(isolatedTrace);

        function doCall() {
            return userland.flow.maybeFuturise(
                executor,
                function (pause) {
                    pause.next(
                        function (/* result */) {
                            /*
                             * Note that the result passed here for the opcode we are about to resume
                             * by re-calling the userland function has already been provided (see Pause),
                             * so the result argument passed to this callback may be ignored.
                             *
                             * If the pause resulted in an error, then we also want to re-call
                             * the function in order to resume with a throwInto at the correct opcode
                             * (see catch handler below).
                             */
                            return doCall();
                        },
                        function (/* error */) {
                            /*
                             * Note that the error passed here for the opcode we are about to throwInto
                             * by re-calling the userland function has already been provided (see Pause),
                             * so the error argument passed to this callback may be ignored.
                             *
                             * Similar to the above, we want to re-call the function in order to resume
                             * with a throwInto at the correct opcode.
                             */
                            return doCall();
                        }
                    );
                }
            );
        }

        return doCall()
            // Always coerce the result to a Value if needed.
            .asValue()
            .finally(function () {
                call.setTrace(originalTrace);

                if (namespaceScope) {
                    userland.namespaceContext.leaveNamespaceScope(namespaceScope);
                }
            });
    },

    /**
     * Enters the top level of userland code (e.g. a module).
     *
     * @param {Function} executor
     * @param {NamespaceScope} namespaceScope
     * @returns {Promise|*}
     */
    enterTopLevel: function (executor, namespaceScope) {
        var result,
            userland = this;

        userland.namespaceContext.enterNamespaceScope(namespaceScope);

        function doCall() {
            return userland.flow.maybeFuturise(
                executor,
                function (pause) {
                    pause.next(
                        function (/* result */) {
                            /*
                             * Note that the result passed here for the opcode we are about to resume
                             * by re-calling the userland function has already been provided (see Pause),
                             * so the result argument passed to this callback may be ignored.
                             *
                             * If the pause resulted in an error, then we also want to re-call
                             * the function in order to resume with a throwInto at the correct opcode
                             * (see catch handler below).
                             */
                            return doCall();
                        },
                        function (/* error */) {
                            /*
                             * Note that the error passed here for the opcode we are about to throwInto
                             * by re-calling the userland function has already been provided (see Pause),
                             * so the error argument passed to this callback may be ignored.
                             *
                             * Similar to the above, we want to re-call the function in order to resume
                             * with a throwInto at the correct opcode.
                             */
                            return doCall();
                        }
                    );
                }
            );
        }

        result = doCall()
            // Always coerce the result to a Value if needed.
            .asValue()
            .finally(function () {
                userland.namespaceContext.leaveNamespaceScope(namespaceScope);
            });

        return userland.mode === 'async' ?
            result.toPromise() :
            result.yieldSync();
    }
});

module.exports = Userland;
