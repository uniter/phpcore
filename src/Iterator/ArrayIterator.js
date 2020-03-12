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
 * Used by transpiled foreach(...) statements to iterate over the elements in an array
 * or the properties of an object that does not implement Traversable
 *
 * @param {ArrayValue|ObjectValue} arrayLikeValue
 * @constructor
 */
function ArrayIterator(arrayLikeValue) {
    /**
     * @type {ArrayValue|ObjectValue}
     */
    this.arrayLikeValue = arrayLikeValue;
    /**
     * @type {number}
     */
    this.pointer = 0;
}

_.extend(ArrayIterator.prototype, {
    /**
     * Advances this iterator to the next element
     */
    advance: function () {
        this.pointer++;
    },

    /**
     * Fetches a reference to the element this iterator is currently pointing at
     *
     * @returns {Reference}
     */
    getCurrentElementReference: function () {
        var iterator = this;

        return iterator.arrayLikeValue.getElementByIndex(iterator.pointer).getReference();
    },

    /**
     * Fetches the value of the element this iterator is currently pointing at
     *
     * @returns {Value}
     */
    getCurrentElementValue: function () {
        var iterator = this;

        return iterator.arrayLikeValue.getElementByIndex(iterator.pointer).getValue();
    },

    /**
     * Fetches the key of the element this iterator is currently pointing at.
     * If the array is empty or the pointer is past the end of the array,
     * null will be returned.
     *
     * @returns {Value|null}
     */
    getCurrentKey: function () {
        var iterator = this;

        return iterator.arrayLikeValue.getKeyByIndex(iterator.pointer);
    },

    /**
     * Fetches the ArrayValue or ObjectValue that this iterator iterates over
     *
     * @returns {ArrayValue|ObjectValue}
     */
    getIteratedValue: function () {
        return this.arrayLikeValue;
    },

    /**
     * Determines whether this iterator is pointing past the end of the array being iterated over
     *
     * @returns {boolean}
     */
    isNotFinished: function () {
        var iterator = this;

        return iterator.pointer < iterator.arrayLikeValue.getLength();
    }
});

module.exports = ArrayIterator;
