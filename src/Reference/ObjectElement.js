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
    util = require('util'),
    Reference = require('./Reference');

function ObjectElement(valueFactory, objectValue, keyValue) {
    this.keyValue = keyValue;
    this.objectValue = objectValue;
    this.valueFactory = valueFactory;
}

util.inherits(ObjectElement, Reference);

_.extend(ObjectElement.prototype, {
    getReference: function () {
        return this;
    },

    getValue: function () {
        var element = this;

        return element.objectValue.callMethod('offsetGet', [element.keyValue]);
    },

    /**
     * Determines whether this reference is defined
     *
     * @returns {boolean}
     */
    isDefined: function () {
        var element = this;

        return element.objectValue.callMethod('offsetExists', [element.keyValue]).getNative();
    },

    /**
     * Determines whether an element of an object is classed as empty.
     * Objects may only have an element fetched if they can be treated as an array,
     * by implementing ArrayAccess
     *
     * @returns {boolean}
     */
    isEmpty: function () {
        var element = this;

        // When using empty() ArrayAccess::offsetGet() will be called and checked
        // if empty only if ArrayAccess::offsetExists() returns TRUE.
        return !element.objectValue.callMethod('offsetExists', [element.keyValue]).getNative() ||
            element.objectValue.callMethod('offsetGet', [element.keyValue]).isEmpty();
    },

    /**
     * Determines whether an element of an object is classed as set.
     * Objects may only have an element fetched if they can be treated as an array,
     * by implementing ArrayAccess
     *
     * @returns {boolean}
     */
    isSet: function () {
        var element = this;

        return element.objectValue.callMethod('offsetExists', [element.keyValue]).getNative() &&
            element.objectValue.callMethod('offsetGet', [element.keyValue]).isSet();
    },

    setValue: function (value) {
        var element = this;

        element.objectValue.callMethod('offsetSet', [element.keyValue, value]);
    },

    unset: function () {
        var element = this;

        element.objectValue.callMethod('offsetUnset', [element.keyValue]);
    }
});

module.exports = ObjectElement;
