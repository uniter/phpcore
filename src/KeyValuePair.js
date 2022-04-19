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

function KeyValuePair(key, value) {
    this.key = key;
    this.value = value;
}

_.extend(KeyValuePair.prototype, {
    /**
     * Returns this pair unchanged.
     *
     * @returns {KeyValuePair}
     */
    asArrayElement: function () {
        return this;
    },

    getKey: function () {
        return this.key;
    },

    getValue: function () {
        return this.value;
    }
});

module.exports = KeyValuePair;
