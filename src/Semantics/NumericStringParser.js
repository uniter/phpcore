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
    // Based on https://www.php.net/manual/en/language.types.numeric-strings.php#language.types.numeric-strings.
    // String must always begin numerically (or with whitespace).
    WHITESPACES = '\\s*',
    LNUM = '[0-9]+',
    DNUM = '(?:(?:[0-9]*[\\.]' + LNUM + ')|(?:' + LNUM + '[\\.][0-9]*))',
    EXPONENT_DNUM = '(?:(?:' + LNUM + '|' + DNUM + ')[eE][+-]?' + LNUM + ')',
    INT_NUM_STRING = WHITESPACES + '[+-]?' + LNUM + WHITESPACES,
    FLOAT_NUM_STRING = WHITESPACES + '[+-]?(?:' + DNUM + '|' + EXPONENT_DNUM + ')' + WHITESPACES,
    NUM_STRING = '(?:(' + FLOAT_NUM_STRING + ')|(' + INT_NUM_STRING + '))';

/**
 * @param {ValueFactory} valueFactory
 * @param {NumericParseFactory} numericParseFactory
 * @constructor
 */
function NumericStringParser(valueFactory, numericParseFactory) {
    /**
     * @type {NumericParseFactory}
     */
    this.numericParseFactory = numericParseFactory;
    /**
     * @type {RegExp}
     */
    this.numericRegex = new RegExp('^' + NUM_STRING + '([\\s\\S]*)$');
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(NumericStringParser.prototype, {
    /**
     * Attempts to parse a string as numeric.
     *
     * @param {string} string
     * @returns {NumericParse|null}
     */
    parseNumericString: function (string) {
        var parser = this,
            match = string.match(parser.numericRegex);

        return match ?
            parser.numericParseFactory.createParse(match) :
            null;
    }
});

module.exports = NumericStringParser;
