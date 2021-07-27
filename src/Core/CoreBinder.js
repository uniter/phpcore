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
    hasOwn = {}.hasOwnProperty,
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception;

/**
 * @constructor
 */
function CoreBinder() {
    /**
     * @type {Object.<string, Function>}
     */
    this.opcodeHandlers = {};
}

_.extend(CoreBinder.prototype, {
    /**
     * Creates a Core instance with all opcode handler methods bound to it,
     * each handler having been wrapped by a function to handle async control flow.
     *
     * @param {Core} core
     * @returns {Core}
     */
    bindCore: function (core) {
        var binder = this,
            // Public properties of Core (.scope etc.) will be inherited
            boundCore = Object.create(core);

        // FIXME: This is all done once per module/script now, change it to build a JS class
        //        by attaching these wrapped handlers to its prototype so the work is only done once?

        function installHandler(name, wrappedHandler) {
            if (hasOwn.call(boundCore, name)) {
                throw new Error('Opcode handler for "' + name + '" has already been installed');
            }

            boundCore[name] = wrappedHandler;
        }

        _.forOwn(binder.opcodeHandlers, function (opcodeHandler, name) {
            installHandler(name, opcodeHandler);
        });

        return boundCore;
    },

    /**
     * Defines the given opcode handler
     *
     * @param {string} opcodeName
     * @param {Function} tracedHandler
     * @param {boolean} allowOverride
     */
    defineOpcode: function (opcodeName, tracedHandler, allowOverride) {
        var binder = this;

        if (!allowOverride && hasOwn.call(binder.opcodeHandlers, opcodeName)) {
            throw new Exception('Handler for opcode "' + opcodeName + '" has already been installed');
        }

        binder.opcodeHandlers[opcodeName] = tracedHandler;
    },

    /**
     * Fetches the existing handlers for the given opcodes, if they are defined
     *
     * @param {string[]} opcodeNames
     * @returns {Object.<string, Function>}
     */
    getOpcodeHandlers: function (opcodeNames) {
        var binder = this,
            handlers = {};

        _.each(opcodeNames, function (opcodeName) {
            if (hasOwn.call(binder.opcodeHandlers, opcodeName)) {
                handlers[opcodeName] = binder.opcodeHandlers[opcodeName];
            }
        });

        return handlers;
    }
});

module.exports = CoreBinder;
