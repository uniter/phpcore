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
    List = require('../../../List'),
    TypeInterface = require('./TypeInterface');

/**
 * Represents a list that may be assigned to.
 *
 * Used by the "list(...)" construct.
 *
 * @constructor
 * @implements {TypeInterface}
 */
function ListType() {

}

util.inherits(ListType, TypeInterface);

_.extend(ListType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        return value instanceof List;
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        if (this.allowsValue(value)) {
            return value;
        }

        throw new Exception('Unexpected value provided for ListType');
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return 'list';
    }
});

module.exports = ListType;
