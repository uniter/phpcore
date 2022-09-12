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
    phpCommon = require('phpcommon'),
    util = require('util'),
    Exception = phpCommon.Exception,
    Reference = require('../../../Reference/Reference'),
    TypeInterface = require('./TypeInterface'),
    Variable = require('../../../Variable').sync();

/**
 * Represents a type where a Reference or Variable is required:
 *
 * - If one is passed it will be left alone.
 * - Any other type, including a Value, will raise an error.
 *
 * @constructor
 */
function ReferenceType() {

}

util.inherits(ReferenceType, TypeInterface);

_.extend(ReferenceType.prototype, {
    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        if ((value instanceof Reference) || (value instanceof Variable)) {
            return value;
        }

        throw new Exception('Unexpected value provided for ReferenceType');
    }
});

module.exports = ReferenceType;
