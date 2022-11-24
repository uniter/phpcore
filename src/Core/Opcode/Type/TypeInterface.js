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
     * would allow the given value.
     *
     * @param {*} value
     * @returns {boolean}
     */
    allowsValue: throwUnimplemented('allowsValue'),

    /**
     * Coerces an argument for a parameter defined with this type (for example) to a value of this type.
     *
     * @param {*} value
     * @returns {*}
     */
    coerceValue: throwUnimplemented('coerceValue'),

    /**
     * Fetches the display name for this type (e.g. "val" or "ref|val").
     *
     * @returns {string}
     */
    getDisplayName: throwUnimplemented('getDisplayName')
});

module.exports = TypeInterface;
