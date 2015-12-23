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

function List(valueFactory, elements) {
    this.elements = elements;
    this.valueFactory = valueFactory;
}

_.extend(List.prototype, {
    setValue: function (value) {
        var list = this;

        if (value.getType() === 'array') {
            _.each(list.elements, function (reference, index) {
                reference.setValue(value.getElementByIndex(index).getValue());
            });
        } else {
            // Non-array value assigned to list, all references should just be nulled
            _.each(list.elements, function (reference) {
                reference.setValue(list.valueFactory.createNull());
            });
        }

        return value;
    }
});

module.exports = List;
