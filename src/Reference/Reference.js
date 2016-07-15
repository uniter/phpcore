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

function Reference() {
}

_.extend(Reference.prototype, {
    getReference: function () {
        return this;
    },

    getValue: function () {
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
