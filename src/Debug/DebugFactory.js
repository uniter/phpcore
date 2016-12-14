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
 * @param {class} DebugFormatter
 * @param {class} DebugValue
 * @param {class} ValueFormatter
 * @constructor
 */
function DebugFactory(DebugFormatter, DebugValue, ValueFormatter) {
    /**
     * @type {class}
     */
    this.DebugFormatter = DebugFormatter;
    /**
     * @type {class}
     */
    this.DebugValue = DebugValue;
    /**
     * @type {class}
     */
    this.ValueFormatter = ValueFormatter;
}

_.extend(DebugFactory.prototype, {
    /**
     * Creates a new DebugFormatter
     *
     * @returns {DebugFormatter}
     */
    createDebugFormatter: function () {
        var factory = this,
            valueFormatter = new factory.ValueFormatter(factory);

        return new factory.DebugFormatter(valueFormatter);
    },

    /**
     * Creates a DebugValue that wraps the specified value
     *
     * @param {Value} value
     * @returns {DebugValue}
     */
    createValue: function (value) {
        return new this.DebugValue(value);
    }
});

module.exports = DebugFactory;
