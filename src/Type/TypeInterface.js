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
    throwUnimplemented = function (functionName) {
        return function () {
            throw new Error(functionName + '() :: Not implemented');
        };
    };

/**
 * @interface
 */
function TypeInterface() {
    throw new Error('TypeInterface cannot be instantiated');
}

_.extend(TypeInterface.prototype, {
    /**
     * Determines whether a parameter defined with this type (for example)
     * would allow a null value
     *
     * @returns {bool}
     */
    allowsNull: throwUnimplemented('allowsNull'),

    /**
     * Determines whether a parameter defined with this type (for example)
     * would allow the given value
     *
     * @param {Value} value
     * @returns {ChainableInterface<boolean>}
     */
    allowsValue: throwUnimplemented('allowsValue'),

    /**
     * Coerces an argument for a parameter defined with this type (for example) to a value of this type.
     * Note that a Future-wrapped Value may be returned, e.g. when an ObjectValue is coerced to string,
     * and its __toString() magic method performs an async pause (eg. a usleep(...) or async I/O operation).
     *
     * Note that if coercion fails, the value provided will be returned unchanged: it is expected
     * that the value will also be tested with .allowsValue(...) during a validation stage.
     *
     * @param {Value} value
     * @returns {ChainableInterface<Value>}
     */
    coerceValue: throwUnimplemented('coerceValue'),

    /**
     * Creates an empty value of this type. Used by the deprecated behaviour of built-in functions
     * that accept a non-nullable type, but were called with null in coercive types mode.
     *
     * Returns null when the type is unable to be coerced to a scalar value.
     *
     * @returns {Value|null}
     */
    createEmptyScalarValue: throwUnimplemented('createEmptyValue'),

    /**
     * Fetches the display name for this type (eg. "string" or "My\Lib\MyClass")
     *
     * @returns {string}
     */
    getDisplayName: throwUnimplemented('getDisplayName'),

    /**
     * Fetches the message to display when this type is an expected type,
     * eg. in an error message where the given argument did not match
     *
     * @param {Translator} translator
     * @returns {string}
     */
    getExpectedMessage: throwUnimplemented('getExpectedMessage'),

    /**
     * Determines whether this type is for a scalar value (integer, string or boolean)
     *
     * @returns {bool}
     */
    isScalar: throwUnimplemented('isScalar')
});

module.exports = TypeInterface;
