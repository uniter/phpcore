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
 * Represents an overloaded PHP function that is to be defined.
 *
 * @param {TypedFunction[]} typedFunctions Each variant of the overloaded function.
 * @constructor
 */
function OverloadedTypedFunction(typedFunctions) {
    /**
     * @type {TypedFunction[]}
     */
    this.typedFunctions = typedFunctions;
}

_.extend(OverloadedTypedFunction.prototype, {
    /**
     * Fetches the underlying typed functions per variant with different parameter counts/signatures.
     *
     * @returns {TypedFunction[]}
     */
    getTypedFunctions: function () {
        return this.typedFunctions;
    }
});

module.exports = OverloadedTypedFunction;
