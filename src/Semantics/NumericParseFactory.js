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
    NumericParse = require('./NumericParse');

/**
 * @param {ValueFactory} valueFactory
 * @constructor
 */
function NumericParseFactory(valueFactory) {
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(NumericParseFactory.prototype, {
    /**
     * Creates a new NumericParse.
     *
     * @param {RegExpMatchArray} match
     * @returns {NumericParse|null}
     */
    createParse: function (match) {
        return new NumericParse(this.valueFactory, match);
    }
});

module.exports = NumericParseFactory;
