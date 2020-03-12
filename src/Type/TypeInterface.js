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
     * @returns {bool}
     */
    allowsValue: throwUnimplemented('allowsValue'),

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
