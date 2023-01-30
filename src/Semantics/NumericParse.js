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
 * Represents the result of attempting to parse a number from a numeric string.
 *
 * @param {ValueFactory} valueFactory
 * @param {RegExpMatchArray} match
 * @constructor
 */
function NumericParse(valueFactory, match) {
    /**
     * @type {RegExpMatchArray}
     */
    this.match = match;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(NumericParse.prototype, {
    /**
     * Fetches the type of number that was matched.
     *
     * @returns {string}
     */
    getType: function () {
        return typeof this.match[1] !== 'undefined' ? 'float' : 'int';
    },

    /**
     * Determines whether the numeric string contained no additional characters
     * after the numeric part, otherwise it would be considered "leading-numeric".
     *
     * @returns {boolean}
     */
    isFullyNumeric: function () {
        return this.match[3] === '';
    },

    /**
     * Creates a FloatValue for this parse, even if it was parsed as an integer.
     *
     * @returns {FloatValue}
     */
    toFloatValue: function () {
        var parse = this,
            type = parse.getType(),
            number = type === 'float' ?
                Number(parse.match[1]) :
                Number(parse.match[2]);

        return parse.valueFactory.createFloat(number);
    },

    /**
     * Creates an IntegerValue for this parse, truncating if it was a float.
     *
     * @returns {IntegerValue}
     */
    toIntegerValue: function () {
        var parse = this,
            type = parse.getType(),
            number = type === 'float' ?
                parseInt(parse.match[1], 10) :
                Number(parse.match[2]);

        return parse.valueFactory.createInteger(number);
    },

    /**
     * Creates either an IntegerValue or FloatValue depending on the match.
     *
     * @returns {IntegerValue|FloatValue}
     */
    toValue: function () {
        var parse = this,
            type = parse.getType();

        return type === 'float' ?
            parse.valueFactory.createFloat(Number(parse.match[1])) :
            parse.valueFactory.createInteger(Number(parse.match[2]));
    }
});

module.exports = NumericParse;
