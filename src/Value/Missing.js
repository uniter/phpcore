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
    util = require('util'),
    NullValue = require('./Null').sync();

/**
 * Represents a missing PHP value, e.g. where a function has returned no value.
 * Similar to null, but allows detection of where no value has been returned at all.
 *
 * @param {ValueFactory} factory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {CallStack} callStack
 * @param {Flow} flow
 * @param {Object} resource
 * @param {string} type
 * @param {number} id
 * @constructor
 */
function MissingValue(
    factory,
    referenceFactory,
    futureFactory,
    callStack,
    flow
) {
    NullValue.call(this, factory, referenceFactory, futureFactory, callStack, flow);
}

util.inherits(MissingValue, NullValue);

_.extend(MissingValue.prototype, {
    /**
     * {@inheritdoc}
     */
    getUnderlyingType: function () {
        return 'missing';
    }
});

module.exports = MissingValue;
