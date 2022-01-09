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
 * @param {ValueFactory} valueFactory
 * @constructor
 */
function SignatureParser(valueFactory) {
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(SignatureParser.prototype, {
    /**
     * Parses the given function signature string.
     *
     * @param {string} signature
     * @returns {Signature}
     */
    parseSignature: function (signature) {
        var match,
            parametersSpecData = [],
            parser = this,
            remainingSignature = signature;

        /**
         * Builds a parameter's spec from the given parameter regex match.
         *
         * @param {Array} match
         * @returns {{name: string, ref: boolean, type: string|undefined, value: Function|null}}
         */
        function buildParameterSpecData(match) {
            var name = match[3],
                passedByReference = Boolean(match[2]),
                spec,
                string,
                type = match[1],
                valueProvider = null;

            if (typeof match[4] !== 'undefined') {
                // Default value is an float literal.
                valueProvider = function () {
                    return parser.valueFactory.createFloat(Number(match[4]));
                };
            } else if (typeof match[5] !== 'undefined') {
                // Default value is an integer literal.
                valueProvider = function () {
                    return parser.valueFactory.createInteger(Number(match[5]));
                };
            } else if (typeof match[6] !== 'undefined') {
                // Default value is a boolean literal.
                valueProvider = function () {
                    return parser.valueFactory.createBoolean(match[6].toLowerCase() === 'true');
                };
            } else if (typeof match[7] !== 'undefined') {
                // Default value is null.
                valueProvider = function () {
                    return parser.valueFactory.createNull();
                };
            } else if (typeof match[8] !== 'undefined') {
                // Default value is a string literal.
                string = match[8];

                try {
                    string = JSON.parse('"' + string + '"');
                } catch (error) {
                    throw new Exception(
                        'SignatureParser.parseSignature() :: Failed to parse string literal: "' + string +
                        '" for parameter "' + name + '"'
                    );
                }

                valueProvider = function () {
                    return parser.valueFactory.createString(string);
                };
            } else if (typeof match[9] !== 'undefined') {
                // Default value is an empty array literal.
                valueProvider = function () {
                    // TODO: Support non-empty arrays.
                    return parser.valueFactory.createArray([]);
                };
            }

            spec = {
                name: name,
                ref: passedByReference,
                // (Note that .type is added below.)
                value: valueProvider
            };

            if (type === 'mixed') {
                // "mixed" type is represented by undefined in the parameter spec data format.
                type = undefined;
            } else if (type !== 'array' && type !== 'callable' && type !== 'iterable') {
                // Any non-builtin type must represent a class (or interface).
                spec.className = type;
                type = 'class';
            }

            spec.type = type;

            return spec;
        }

        while (remainingSignature.length > 0) {
            // TODO: Support non-empty array literals as default values.
            match = remainingSignature.match(
                /^([\w\\]+)\s*(?:(&)\s*)?\$(\w+)(?:\s*=\s*(?:(\d*\.\d+)|(\d+)|(true|false)|(null)|"((?:[^\\"]|\\[\s\S])*)"|\[()]))?\s*(?:,\s*)?/i
            );

            if (!match) {
                throw new Exception('SignatureParser.parseSignature() :: Invalid function signature: "' + signature + '"');
            }

            parametersSpecData.push(buildParameterSpecData(match));

            remainingSignature = remainingSignature.substr(match[0].length);
        }

        return new Signature(parametersSpecData);
    }
});

module.exports = SignatureParser;
