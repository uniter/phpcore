/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash'),
    require('util'),
    require('../../Value')
], function (
    _,
    util,
    Value
) {
    /**
     * @param {ValueFactory} factory
     * @param {CallStack} callStack
     * @param {ValueCaller} valueCaller
     * @param {ObjectValue} wrappedObjectValue
     * @constructor
     */
    function AsyncObjectValue(factory, callStack, valueCaller, wrappedObjectValue) {
        var nativeValue = wrappedObjectValue.getObject();

        Value.call(this, factory, callStack, 'object', nativeValue);

        /**
         * @type {ValueCaller}
         */
        this.valueCaller = valueCaller;
        /**
         * @type {ObjectValue}
         */
        this.wrappedObjectValue = wrappedObjectValue;
    }

    util.inherits(AsyncObjectValue, Value);

    _.extend(AsyncObjectValue.prototype, {
        /**
         * Calls the specified method of this object
         *
         * @param {string} methodName
         * @param {Value[]?} args
         * @returns {Promise<Value>} Returns the result of the method
         * @throws {PHPFatalError} Throws when the method does not exist
         */
        callMethod: function (methodName, args) {
            var value = this;

            return value.valueCaller.callMethod(value.wrappedObjectValue, methodName, args);
        }
    });

    return AsyncObjectValue;
}, {strict: true});
