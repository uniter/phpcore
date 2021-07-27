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

/**
 * Represents a virtual "element" of an ObjectValue whose class implements ArrayAccess
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {Flow} flow
 * @param {ObjectValue} objectValue
 * @param {Value} keyValue
 * @constructor
 */
function ObjectElement(
    valueFactory,
    referenceFactory,
    flow,
    objectValue,
    keyValue
) {
    Reference.call(this, referenceFactory, flow);

    /**
     * @type {Value}
     */
    this.keyValue = keyValue;
    /**
     * @type {ObjectValue}
     */
    this.objectValue = objectValue;
    /**
     * @type {ValueFactory}
     */
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
     * @returns {Future<boolean>|Present<boolean>}
     */
    isEmpty: function () {
        var element = this;

        return element.objectValue.callMethod('offsetExists', [element.keyValue])
            .getValue()
            .next(function (resultValue) {
                if (!resultValue.getNative()) {
                    // ->offsetExists(...) returned false, no need to check further
                    return true;
                }

                return element.objectValue.callMethod('offsetGet', [element.keyValue])
                    .getValue()
                    .isEmpty();
            });
    },

    /**
     * Determines whether an element of an object is classed as set.
     * Objects may only have an element fetched if they can be treated as an array,
     * by implementing ArrayAccess
     *
     * @returns {FutureValue<boolean>}
     */
    isSet: function () {
        var element = this;

        return element.objectValue.callMethod('offsetExists', [element.keyValue])
            .getValue()
            .next(function (resultValue) {
                if (!resultValue.getNative()) {
                    // ->offsetExists(...) returned false, no need to check further
                    return false;
                }

                return element.objectValue.callMethod('offsetGet', [element.keyValue])
                    .getValue()
                    .isSet();
            });
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
