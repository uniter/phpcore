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
 * Represents a list of references to assign elements of an array to.
 *
 * Used by the "list(...)" construct.
 *
 * @param {ValueFactory} valueFactory
 * @param {Flow} flow
 * @param {Reference[]|Variable[]} elements
 * @constructor
 */
function List(valueFactory, flow, elements) {
    /**
     * @type {Reference[]|Variable[]}
     */
    this.elements = elements;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(List.prototype, {
    /**
     * Assigns the given value to the list.
     *
     * @param {Value} value
     * @returns {ChainableInterface<Value>}
     */
    setValue: function (value) {
        var list = this;

        if (value.getType() === 'array') {
            return list.flow
                .eachAsync(list.elements, function (reference, index) {
                    return value.getElementByIndex(index).getValue()
                        .next(function (value) {
                            // Note that .setValue(...) could return a Future(Value) here to be awaited.
                            return reference.setValue(value);
                        });
                })
                .next(function () {
                    return value;
                });
        }

        // Non-array value assigned to list, all references should just be nulled.
        return list.flow
            .eachAsync(list.elements, function (reference) {
                // Note that .setValue(...) could return a Future(Value) here to be awaited.
                return reference.setValue(list.valueFactory.createNull());
            })
            .next(function () {
                return value;
            });
    }
});

module.exports = List;
