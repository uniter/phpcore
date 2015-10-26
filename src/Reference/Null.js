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

function NullReference(valueFactory, options) {
    options = options || {};

    this.onSet = options.onSet;
    this.valueFactory = valueFactory;
}

_.extend(NullReference.prototype, {
    getValue: function () {
        return this.valueFactory.createNull();
    },

    setValue: function () {
        var reference = this;

        if (reference.onSet) {
            reference.onSet();
        }
    }
});

module.exports = NullReference;
