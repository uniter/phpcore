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
    INSTANCE_OF_TYPE_EXPECTED = 'core.instance_of_type_expected',
    TypeInterface = require('./TypeInterface');

/**
 * Represents a type that can only accept an instance of the specified class or interface or null (if allowed)
 *
 * @param {FutureFactory} futureFactory
 * @param {string} className
 * @param {boolean} nullIsAllowed
 * @constructor
 */
function ClassType(futureFactory, className, nullIsAllowed) {
    /**
     * @type {string}
     */
    this.className = className;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * Note that whether a type is nullable is not directly related to whether a parameter using that type is nullable -
     * if the default value is null then it will allow null, which is checked in the Parameter class.
     *
     * @type {boolean}
     */
    this.nullIsAllowed = nullIsAllowed;
}

util.inherits(ClassType, TypeInterface);

_.extend(ClassType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsNull: function () {
        var typeObject = this;

        return typeObject.nullIsAllowed;
    },

    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        var typeObject = this;

        return typeObject.futureFactory.createPresent(
            (value.getType() === 'object' && value.classIs(typeObject.className)) ||
            (typeObject.allowsNull() && value.getType() === 'null')
        );
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        return value; // No special coercion to perform.
    },

    /**
     * {@inheritdoc}
     */
    createEmptyScalarValue: function () {
        return null;
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return this.className;
    },

    /**
     * {@inheritdoc}
     */
    getExpectedMessage: function (translator) {
        return translator.translate(INSTANCE_OF_TYPE_EXPECTED, {
            expectedType: this.getDisplayName()
        });
    },

    /**
     * {@inheritdoc}
     */
    isScalar: function () {
        return false; // This is not a scalar type hint
    }
});

module.exports = ClassType;
