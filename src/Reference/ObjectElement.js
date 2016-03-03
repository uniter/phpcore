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

function ObjectElement(valueFactory, objectValue, keyValue) {
    this.keyValue = keyValue;
    this.objectValue = objectValue;
    this.valueFactory = valueFactory;
}

_.extend(ObjectElement.prototype, {
    getValue: function () {
        var element = this;

        return element.objectValue.callMethod('offsetGet', [element.keyValue]);
    },

    isSet: function () {
        var element = this;

        return element.objectValue.callMethod('offsetExists', [element.keyValue]).getNative();
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
