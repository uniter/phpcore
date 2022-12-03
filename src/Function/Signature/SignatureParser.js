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
    scalarTypes = {
        'bool': true,
        'float': true,
        'int': true,
        'string': true
    },
    Exception = phpCommon.Exception,
    Signature = require('./Signature');

/**
 * @param {ValueFactory} valueFactory
 * @constructor
 */
function SignatureParser(valueFactory) {
    /**
     * @type {Namespace|null}
     */
    this.globalNamespace = null;
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
            remainingSignature = signature,
            returnByReference = false,
            returnTypeSpecData = null;

        /**
         * Builds a type's spec from the given attributes.
         *
         * @param {string} type Raw type string, eg. "string" or "My\Stuff"
         * @param {boolean} nullable
         * @returns {type: string, nullable: boolean, className: string, scalarType: string}
         */
        function buildTypeSpecData(type, nullable) {
            var spec = {};

            if (type === 'mixed') {
                // "mixed" type is represented by undefined in the parameter spec data format.
                type = undefined;
                // "mixed" type always accepts null.
                nullable = true;
            } else if (hasOwn.call(scalarTypes, type)) {
                // Type is a scalar type (int, string etc.)
                spec.scalarType = type;
                type = 'scalar';
            } else if (type !== 'array' && type !== 'callable' && type !== 'iterable' && type !== 'object') {
                // Any non-builtin type must represent a class (or interface).
                spec.className = type;
                type = 'class';
            }

            spec.type = type;
            spec.nullable = nullable;

            return spec;
        }

        /**
         * Builds a parameter's spec from the given parameter regex match.
         *
         * @param {Array} match
         * @returns {{name: string, ref: boolean, type: string|undefined, value: Function|null}}
         */
        function buildParameterSpecData(match) {
            var name = match[4],
                passedByReference = Boolean(match[3]),
                spec,
                string,
                type = match[2],
                nullable = match[1] === '?',
                valueProvider = null;

            if (typeof match[5] !== 'undefined') {
                // Default value is an float literal.
                valueProvider = function () {
                    return parser.valueFactory.createFloat(Number(match[5]));
                };
            } else if (typeof match[6] !== 'undefined') {
                // Default value is an integer literal.
                valueProvider = function () {
                    return parser.valueFactory.createInteger(Number(match[6]));
                };
            } else if (typeof match[7] !== 'undefined') {
                // Default value is a boolean literal.
                valueProvider = function () {
                    return parser.valueFactory.createBoolean(match[7].toLowerCase() === 'true');
                };
            } else if (typeof match[8] !== 'undefined') {
                // Default value is null.
                valueProvider = function () {
                    return parser.valueFactory.createNull();
                };

                // A default value of null implicitly allows null as an argument.
                nullable = true;
            } else if (typeof match[9] !== 'undefined') {
                // Default value is a string literal.
                string = match[9];

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
            } else if (typeof match[10] !== 'undefined') {
                // Default value is an empty array literal.
                valueProvider = function () {
                    // TODO: Support non-empty arrays.
                    return parser.valueFactory.createArray([]);
                };
            } else if (typeof match[11] !== 'undefined') {
                // Default value is a constant.
                valueProvider = function () {
                    return parser.globalNamespace.getConstant(match[11], false);
                };
            }

            spec = buildTypeSpecData(type, nullable);

            spec.name = name;
            spec.ref = passedByReference;
            spec.value = valueProvider;

            return spec;
        }

        while (remainingSignature.length > 0 && !/^\s*:/.test(remainingSignature)) {
            // TODO: Support non-empty array literals as default values.
            match = remainingSignature.match(
                /^\s*(?:(\?)\s*)?([\w\\]+)\s*(?:(&)\s*)?\$(\w+)(?:\s*=\s*(?:(-?\d*\.\d+)|(-?\d+)|(true|false)|(null)|"((?:[^\\"]|\\[\s\S])*)"|\[()]|([\w_]+)))?\s*(?:,\s*)?/i
            );

            if (!match) {
                throw new Exception(
                    'SignatureParser.parseSignature() :: Invalid function signature "' + signature +
                    '" near "' + remainingSignature.substr(0, 20) + '..."'
                );
            }

            parametersSpecData.push(buildParameterSpecData(match));

            remainingSignature = remainingSignature.substr(match[0].length);
        }

        if (remainingSignature.length > 0) {
            // Signature declares a return type.

            match = remainingSignature.match(
                /^\s*:\s*(?:(&)\s*)?(?:(\?)\s*)?([\w\\]+)\s*$/i
            );

            if (!match) {
                throw new Exception(
                    'SignatureParser.parseSignature() :: Invalid function signature "' + signature +
                    '" near "' + remainingSignature.substr(0, 20) + '..."'
                );
            }

            returnTypeSpecData = buildTypeSpecData(match[3], match[2] === '?');

            returnByReference = match[1] === '&';
        }

        return new Signature(parametersSpecData, returnTypeSpecData, returnByReference);
    },

    /**
     * Injects the global Namespace service. Required to solve a circular dependency issue.
     *
     * @param {Namespace} globalNamespace
     */
    setGlobalNamespace: function (globalNamespace) {
        this.globalNamespace = globalNamespace;
    }
});

module.exports = SignatureParser;
