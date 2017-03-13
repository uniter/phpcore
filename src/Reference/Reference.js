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
 * Interface for references to extend to allow instanceof checking
 *
 * @constructor
 */
function Reference() {
    throw new Error('Reference is an interface, no need to instantiate it');
}

_.extend(Reference.prototype, {
    getReference: function () {
        return this;
    },

    getValue: function () {
        throw new Error('Not implemented');
    },

    /**
     * Determines whether the reference is classed as "empty" or not
     *
     * @returns {boolean}
     */
    isEmpty: function () {
        throw new Error('Not implemented');
    },

    isSet: function () {
        throw new Error('Not implemented');
    },

    setValue: function () {
        throw new Error('Not implemented');
    }
});

module.exports = Reference;
