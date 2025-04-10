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
     * @param {IsolatedScope=} isolatedScope
     * @returns {ChainableInterface}
     */
    enterIsolated: function (executor, isolatedScope) {
        var userland = this,
            call = userland.callStack.getCurrent(),
            isolatedTrace = userland.controlFactory.createTrace(),
            originalTrace;

        if (isolatedScope) {
            call.enterIsolatedCall(isolatedScope);
        }

        originalTrace = call.setTrace(isolatedTrace);

        function doCall() {
            return userland.flow.maybeFuturise(
                executor,
                function (pause, onResume) {
                    // The executor is expected to be pure, as it should just be a constant value,
                    // so on resume we can just call it again.
                    onResume(doCall);
                }
            );
        }

        return doCall()
            // Always coerce the result to a Value if needed.
            .asValue()
            .finally(function () {
                call.setTrace(originalTrace);

                if (isolatedScope) {
                    call.leaveIsolatedCall(isolatedScope);
                }
            });
    },

    /**
     * Enters the top level of userland code (e.g. a module).
     *
     * @param {Function} executor
     * @returns {Promise|*}
     */
    enterTopLevel: function (executor) {
        var result,
            userland = this;

        function doCall() {
            return userland.flow.maybeFuturise(
                executor,
                function (pause, onResume) {
                    onResume(doCall);
                }
            );
        }

        result = doCall()
            // Always coerce the result to a Value if needed.
            .asValue();

        return userland.mode === 'async' ?
            result.toPromise() :
            result.yieldSync();
    }
});

module.exports = Userland;
