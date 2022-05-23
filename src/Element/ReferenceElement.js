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
 * Represents an element of an array whose key is unspecified and is to be a reference.
 *
 * @param {Reference} reference
 * @constructor
 */
function ReferenceElement(reference) {
    /**
     * @type {Reference}
     */
    this.reference = reference;
}

_.extend(ReferenceElement.prototype, {
    /**
     * Returns this element unchanged.
     *
     * @returns {ReferenceElement}
     */
    asArrayElement: function () {
        return this;
    },

    /**
     * Fetches the reference.
     *
     * @returns {Reference}
     */
    getReference: function () {
        return this.reference;
    }
});

module.exports = ReferenceElement;
