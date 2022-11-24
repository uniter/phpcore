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
    Signature = require('./Signature');

/**
 * Parses opcode signatures.
 *
 * @param {TypeProvider} typeProvider
 * @param {ParameterFactory} parameterFactory
 * @constructor
 */
function SignatureParser(typeProvider, parameterFactory) {
    /**
     * @type {ParameterFactory}
     */
    this.parameterFactory = parameterFactory;
    /**
     * @type {TypeProvider}
     */
    this.typeProvider = typeProvider;
}

_.extend(SignatureParser.prototype, {
    /**
     * Parses the given opcode signature string.
     *
     * @param {string} signature
     * @returns {Signature}
     */
    parseSignature: function (signature) {
        var match,
            parameter,
            parameters = [],
            parser = this,
            previousParameter = null,
            remainingSignature = signature,
            returnType;

        /**
         * Builds a parameter from the given parameter regex match.
         *
         * @param {Array} match
         * @returns {Parameter}
         */
        function buildParameter(match) {
            var isRequired = typeof match[5] === 'undefined',
                defaultArgument = isRequired ? null : JSON.parse(match[5]),
                name = match[4],
                isInitial = match[1] === 'initial',
                isVariadic = Boolean(match[3]),
                typeName = match[2],
                type = parser.typeProvider.provideType(typeName);

            return parser.parameterFactory.createParameter(
                name,
                type,
                isInitial,
                isRequired,
                isVariadic,
                defaultArgument
            );
        }

        while (remainingSignature.length > 0 && !/^\s*:/.test(remainingSignature)) {
            match = remainingSignature.match(
                /^\s*(initial)?\s*(\w+(?:\|\w+)*)\s+(\.{3})?(\w+)(?:\s*=\s*([^,\s]+))?\s*(?:,\s*)?/i
            );

            if (!match) {
                throw new Exception(
                    'SignatureParser.parseSignature() :: Invalid opcode signature "' + signature +
                    '" near "' + remainingSignature.substr(0, 20) + '..."'
                );
            }

            if (previousParameter && previousParameter.isVariadic()) {
                throw new Exception(
                    'SignatureParser.parseSignature() :: Variadic parameter "' +
                    previousParameter.getName() +
                    '" must be the final parameter'
                );
            }

            parameter = buildParameter(match);
            parameters.push(parameter);

            remainingSignature = remainingSignature.substr(match[0].length);

            previousParameter = parameter;
        }

        if (remainingSignature.length > 0) {
            // Signature declares a return type.

            match = remainingSignature.match(
                /^\s*:\s*(\w+(?:\|\w+)*)\s*$/i
            );

            if (!match) {
                throw new Exception(
                    'SignatureParser.parseSignature() :: Invalid opcode signature "' + signature +
                    '" near "' + remainingSignature.substr(0, 20) + '..."'
                );
            }

            returnType = parser.typeProvider.provideType(match[1]);
        } else {
            returnType = parser.typeProvider.provideAnyType();
        }

        return new Signature(parameters, returnType);
    }
});

module.exports = SignatureParser;
