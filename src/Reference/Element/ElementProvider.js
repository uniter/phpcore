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
    ElementReference = require('../Element');

/**
 * Creates standard (unhooked) array elements
 *
 * @constructor
 */
function ElementProvider() {

}

_.extend(ElementProvider.prototype, {
    /**
     * Creates a standard (unhooked) array element
     *
     * @param {ValueFactory} valueFactory
     * @param {CallStack} callStack
     * @param {ArrayValue} arrayValue
     * @param {Value} key
     * @param {Value|null} value
     * @param {Reference|null} reference
     * @returns {ElementReference}
     */
    createElement: function (valueFactory, callStack, arrayValue, key, value, reference) {
        return new ElementReference(valueFactory, callStack, arrayValue, key, value, reference);
    }
});

module.exports = ElementProvider;
