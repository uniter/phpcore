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
 * Types opcode handlers.
 *
 * @param {SignatureParser} signatureParser
 * @param {TypedOpcodeHandlerFactory} typedOpcodeHandlerFactory
 * @constructor
 */
function OpcodeHandlerTyper(signatureParser, typedOpcodeHandlerFactory) {
    /**
     * @type {SignatureParser}
     */
    this.signatureParser = signatureParser;
    /**
     * @type {TypedOpcodeHandlerFactory}
     */
    this.typedOpcodeHandlerFactory = typedOpcodeHandlerFactory;
}

_.extend(OpcodeHandlerTyper.prototype, {
    /**
     * Creates a typed opcode handler.
     *
     * @param {string} signature
     * @param {Function} handler
     * @returns {Function}
     */
    typeHandler: function (signature, handler) {
        var typer = this,
            opcodeSignature = typer.signatureParser.parseSignature(signature);

        return typer.typedOpcodeHandlerFactory.typeHandler(opcodeSignature, handler);
    }
});

module.exports = OpcodeHandlerTyper;
