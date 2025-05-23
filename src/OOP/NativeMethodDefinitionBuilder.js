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
    IS_STATIC = 'isStatic',
    TypedFunction = require('../Function/TypedFunction');

/**
 * Builds definitions for methods of native classes or traits (those defined using JavaScript code).
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
     * Builds the definition for a method of a native class or trait.
     *
     * @param {Function|TypedFunction|*} method Potential method
     * @param {ValueCoercer} valueCoercer
     * @returns {Object|null}
     */
    buildMethod: function (method, valueCoercer) {
        var builder = this,
            autoCoercionEnabled = valueCoercer.isAutoCoercionEnabled(),
            isStatic,
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

        // Only check this property on the actual function, not any TypedFunction wrapper.
        isStatic = Boolean(method[IS_STATIC]);

        return {
            line: null,
            args: parametersSpecData,
            isStatic: isStatic,
            method: function () {
                var args = slice.call(arguments),
                    scope = this,
                    objectValue = scope.getThisObject();

                return valueCoercer.coerceArguments(args).next(function (effectiveArguments) {
                    return method.apply(
                        autoCoercionEnabled ?
                            objectValue.getObject() :
                            objectValue,
                        effectiveArguments
                    );
                });
            },
            ref: returnByReference,
            ret: returnTypeSpecData
        };
    }
});

module.exports = NativeMethodDefinitionBuilder;
