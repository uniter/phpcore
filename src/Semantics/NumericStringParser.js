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
    LOWER_CASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz',
    UPPER_CASE_LETTERS = LOWER_CASE_LETTERS.toUpperCase(),

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
     * Increments the given string using the PHP alphanumeric string increment rules.
     *
     * @param {string} numberString
     * @returns {string}
     */
    incrementAlphanumericString: function (numberString) {
        var carryType = null,
            char,
            index,
            position;

        if (numberString === '') {
            // Special case: incrementing the empty string results in the string "1".
            return '1';
        }

        for (index = numberString.length - 1; index >= 0; index--) {
            char = numberString.charAt(index);

            if (/[0-9]/.test(char)) {
                // Digit characters are incremented numerically as would be expected.
                carryType = char === '9' ? 'digit' : null;

                char = (Number(char) + 1) % 10;
            } else if ((position = LOWER_CASE_LETTERS.indexOf(char)) > -1) {
                // Lower case characters advance to the next letter of the alphabet, wrapping round
                // but staying lower case.
                carryType = position === LOWER_CASE_LETTERS.length - 1 ? 'lower' : null;

                char = LOWER_CASE_LETTERS[(position + 1) % 26];
            } else if ((position = UPPER_CASE_LETTERS.indexOf(char)) > -1) {
                // As above, but for upper case characters which also maintain their case.
                carryType = position === UPPER_CASE_LETTERS.length - 1 ? 'upper' : null;

                char = UPPER_CASE_LETTERS[(position + 1) % 26];
            } else {
                // Character does not meet the rules: no more characters
                // are to be incremented.
                break;
            }

            // Replace the incremented character in the working string.
            numberString = numberString.substring(0, index) +
                char +
                numberString.substring(index + 1);

            if (carryType === null) {
                break;
            }
        }

        if (carryType !== null) {
            /*
             * We have reached the beginning of the string, but there is a carry left to be done:
             * we'll need to prepend the relevant character
             * depending on the type of the character that caused the carry.
             */

            if (carryType === 'digit') {
                char = '1';
            } else if (carryType === 'lower') {
                char = 'a';
            } else if (carryType === 'upper') {
                char = 'A';
            }

            // Prepend the new final carry character: note that it may not be added at the beginning
            // of the string if there are non-participating characters there.
            numberString = numberString.substring(0, index + 1) +
                char +
                numberString.substring(index + 1);
        }

        return numberString;
    },

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
