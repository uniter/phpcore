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

function NullReference(valueFactory, options) {
    options = options || {};

    this.onSet = options.onSet;
    this.valueFactory = valueFactory;
}

util.inherits(NullReference, Reference);

_.extend(NullReference.prototype, {
    getReference: function () {
        return this;
    },

    getValue: function () {
        return this.valueFactory.createNull();
    },

    /**
     * Determines whether this reference is defined
     *
     * @returns {boolean}
     */
    isDefined: function () {
        return false;
    },

    /**
     * Determines whether this reference is empty or not
     * (NULL references are always empty)
     *
     * @returns {boolean}
     */
    isEmpty: function () {
        return true; // PHP NULL is classed as empty
    },

    isSet: function () {
        return false;
    },

    setValue: function () {
        var reference = this;

        if (reference.onSet) {
            reference.onSet();
        }
    }
});

module.exports = NullReference;
