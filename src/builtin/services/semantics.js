/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var NumericParseFactory = require('../../Semantics/NumericParseFactory'),
    NumericStringParser = require('../../Semantics/NumericStringParser'),

    NUMERIC_PARSE_FACTORY = 'numeric_parse_factory',
    VALUE_FACTORY = 'value_factory';

/**
 * Provides services for handling of language semantics.
 *
 * @param {ServiceInternals} internals
 */
module.exports = function (internals) {
    var get = internals.getServiceFetcher();

    return {
        'numeric_parse_factory': function () {
            return new NumericParseFactory(get(VALUE_FACTORY));
        },

        'numeric_string_parser': function () {
            return new NumericStringParser(get(VALUE_FACTORY), get(NUMERIC_PARSE_FACTORY));
        }
    };
};
