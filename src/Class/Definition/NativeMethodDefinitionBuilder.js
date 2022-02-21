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
    slice = [].slice,
    TypedFunction = require('../../Function/TypedFunction');

/**
 * Builds definitions for methods of native classes (those defined using JavaScript code).
 *
 * @param {SignatureParser} signatureParser
 * @constructor
 */
function NativeMethodDefinitionBuilder(signatureParser) {
    /**
     * @type {SignatureParser}
     */
    this.signatureParser = signatureParser;
}

_.extend(NativeMethodDefinitionBuilder.prototype, {
    /**
     * Builds the definition for a method of a native class.
     *
     * @param {Function|TypedFunction|*} method Potential method
     * @param {ValueCoercer} valueCoercer
     * @returns {Object|null}
     */
    buildMethod: function (method, valueCoercer) {
        var builder = this,
            autoCoercionEnabled = valueCoercer.isAutoCoercionEnabled(),
            parametersSpecData,
            returnByReference = false,
            returnTypeSpecData = null,
            signature;

        if (method instanceof TypedFunction) {
            // Method was defined with a signature, using internals.typeFunction(...).
            signature = builder.signatureParser.parseSignature(method.getSignature());
            parametersSpecData = signature.getParametersSpecData();
            returnTypeSpecData = signature.getReturnTypeSpecData();
            returnByReference = signature.isReturnByReference();

            method = method.getFunction();
        }

        if (typeof method !== 'function') {
            // This method will be called for all properties of the internal class:
            // we only want to wrap methods, so return null to skip others.
            return null;
        }

        return {
            line: null,
            args: parametersSpecData,
            isStatic: false,
            method: function () {
                var args = slice.call(arguments),
                    scope = this,
                    objectValue = scope.getThisObject();

                return method.apply(
                    autoCoercionEnabled ?
                        objectValue.getObject() :
                        objectValue,
                    valueCoercer.coerceArguments(args)
                );
            },
            ref: returnByReference,
            ret: returnTypeSpecData
        };
    }
});

module.exports = NativeMethodDefinitionBuilder;
