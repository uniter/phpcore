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
 * Represents a key-value pair for an element of an associative array.
 *
 * TODO: Move to Element folder?
 *
 * @param {Value} key
 * @param {Value} value
 * @constructor
 */
function KeyValuePair(key, value) {
    /**
     * @type {Value}
     */
    this.key = key;
    /**
     * @type {Value}
     */
    this.value = value;
}

_.extend(KeyValuePair.prototype, {
    /**
     * Returns this pair with the value resolved to a present if necessary.
     *
     * @returns {ChainableInterface<KeyValuePair>}
     */
    asArrayElement: function () {
        var pair = this;

        if (!pair.value.isFuture()) {
            return pair;
        }

        return pair.value
            .next(function (presentValue) {
                return new KeyValuePair(pair.key, presentValue);
            });
    },

    /**
     * Fetches the value of the key of the pair.
     *
     * @returns {Value}
     */
    getKey: function () {
        return this.key;
    },

    /**
     * Fetches the value of the pair.
     *
     * @returns {Value}
     */
    getValue: function () {
        return this.value;
    }
});

module.exports = KeyValuePair;
