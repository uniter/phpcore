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
 * @param {Internals} baseInternals
 * @param {OpcodeHandlerFactory} opcodeHandlerFactory
 * @param {OpcodeHandlerTyper} opcodeHandlerTyper
 * @constructor
 */
function OpcodeInternalsClassFactory(
    baseInternals,
    opcodeHandlerFactory,
    opcodeHandlerTyper
) {
    /**
     * @type {Internals}
     */
    this.baseInternals = baseInternals;
    /**
     * @type {OpcodeHandlerFactory}
     */
    this.opcodeHandlerFactory = opcodeHandlerFactory;
    /**
     * @type {OpcodeHandlerTyper}
     */
    this.opcodeHandlerTyper = opcodeHandlerTyper;
}

_.extend(OpcodeInternalsClassFactory.prototype, {
    /**
     * Creates an OpcodeInternals class for use when defining an opcode handler group
     *
     * @return {class}
     */
    create: function () {
        var factory = this;

        /**
         * @constructor
         */
        function OpcodeInternals() {
            /**
             * @type {string|null}
             */
            this.opcodeFetcher = null;
            /**
             * @type {boolean}
             */
            this.opcodeOverrideAllowed = false;
            /**
             * @type {Object.<string, Function>}
             */
            this.previousOpcodes = {};
            /**
             * Whether tracing is disabled for the opcodes altogether
             *
             * @type {boolean}
             */
            this.untraced = false;
        }

        // Extend the base Internals object so we inherit all the public service properties etc.
        OpcodeInternals.prototype = Object.create(factory.baseInternals);

        _.extend(OpcodeInternals.prototype, {
            /**
             * Allows opcodes in this group to override previously defined ones
             */
            allowOpcodeOverride: function () {
                this.opcodeOverrideAllowed = true;
            },

            /**
             * Calls the previous handler for this opcode, if one was defined.
             * Note that the previous handler's signature will not be checked or coerced by.
             *
             * @param {string} name
             * @param {*[]} args
             * @throws {Exception} Throws when opcode overriding has not been allowed for this group
             */
            callPreviousHandler: function (name, args) {
                var internals = this,
                    previousHandler;

                if (!internals.hasPreviousHandler(name)) {
                    throw new Exception('Opcode "' + name + '" has no previous handler');
                }

                previousHandler = internals.previousOpcodes[name];

                // TODO: Check/coerce by the previous opcode signature?
                if (previousHandler.opcodeHandler && previousHandler.opcodeHandler.typedOpcodeHandler) {
                    previousHandler = previousHandler.opcodeHandler.typedOpcodeHandler;
                }

                return previousHandler.apply(null, args);
            },

            /**
             * Creates the traced opcode handler
             *
             * @param {Function} handler The underlying opcode handler
             * @returns {Function}
             */
            createTracedHandler: function (opcodeHandler) {
                var internals = this;

                if (internals.untraced) {
                    // No tracer-wrapping to do
                    return opcodeHandler;
                }

                if (!internals.opcodeFetcher) {
                    throw new Exception('Opcode fetcher has not been set');
                }

                return factory.opcodeHandlerFactory.createTracedHandler(
                    opcodeHandler,
                    internals.opcodeFetcher
                );
            },

            /**
             * Marks these opcodes as not to be traced. Useful for special internal opcodes,
             * such as the pausing() opcode which is used during the pause process
             * in order to skip error handling (as Pause instances are a special type of JS Error)
             */
            disableTracing: function () {
                this.untraced = true;
            },

            /**
             * Determines whether the given opcode has a previous handler defined,
             * providing opcode overriding has been enabled
             *
             * @param {string} opcodeName
             * @returns {boolean}
             * @throws {Exception} Throws when opcode overriding has not been allowed for this group
             */
            hasPreviousHandler: function (opcodeName) {
                var internals = this;

                if (!internals.opcodeOverrideAllowed) {
                    throw new Exception('Opcode overriding has not been allowed for the group');
                }

                return hasOwn.call(internals.previousOpcodes, opcodeName);
            },

            /**
             * Determines whether opcode overriding is allowed for this group
             *
             * @returns {boolean}
             */
            isOpcodeOverrideAllowed: function () {
                return this.opcodeOverrideAllowed;
            },

            /**
             * Exposes the OpcodeHandlerFactory service
             *
             * @type {OpcodeHandlerFactory}
             * @public
             */
            opcodeHandlerFactory: factory.opcodeHandlerFactory,

            /**
             * Sets the opcode fetcher for the group
             *
             * @param {string} opcodeFetcher
             */
            setOpcodeFetcher: function (opcodeFetcher) {
                this.opcodeFetcher = opcodeFetcher;
            },

            /**
             * Sets the previous handlers for the opcodes defined for this group,
             * when opcode overriding has been enabled.
             *
             * @param {Object.<string, Function>} previousOpcodes
             */
            setPreviousOpcodes: function (previousOpcodes) {
                this.previousOpcodes = previousOpcodes;
            },

            /**
             * Creates a new opcode handler that handles the given parameter signature.
             *
             * @param {string} signature
             * @param {Function} handler
             * @returns {Function}
             */
            typeHandler: function (signature, handler) {
                var internals = this;

                if (internals.untraced) {
                    throw new Exception('Cannot type an untraced opcode handler');
                }

                if (!internals.opcodeFetcher) {
                    throw new Exception('Opcode fetcher has not been set');
                }

                return factory.opcodeHandlerTyper.typeHandler(signature, handler);
            }
        });

        return OpcodeInternals;
    }
});

module.exports = OpcodeInternalsClassFactory;
