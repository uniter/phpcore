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
     * Coerces an argument for a parameter defined with this type (for example) to a value of this type.
     *
     * @param {*} value
     * @returns {*}
     */
    coerceValue: throwUnimplemented('coerceValue')
});

module.exports = TypeInterface;
