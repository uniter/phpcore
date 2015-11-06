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
    require('../Reference/Null'),
    require('../Value')
], function (
    _,
    util,
    NullReference,
    Value
) {
    function StringValue(factory, callStack, value) {
        Value.call(this, factory, callStack, 'string', value);
    }

    util.inherits(StringValue, Value);

    _.extend(StringValue.prototype, {
        add: function (rightValue) {
            return rightValue.addToString(this);
        },

        addToBoolean: function (booleanValue) {
            return this.coerceToNumber().add(booleanValue);
        },

        call: function (args, namespaceOrNamespaceScope) {
            return namespaceOrNamespaceScope.getGlobalNamespace().getFunction(this.value).apply(null, args);
        },

        callMethod: function (name, args, namespaceScope) {
            var value = this;

            return value.callStaticMethod(value.factory.coerce(name), args, namespaceScope);
        },

        callStaticMethod: function (nameValue, args, namespaceScope) {
            var value = this,
                classObject = namespaceScope.getClass(value.value);

            return classObject.callStaticMethod(nameValue.getNative(), args);
        },

        coerceToBoolean: function () {
            return this.factory.createBoolean(this.value !== '' && this.value !== '0');
        },

        coerceToFloat: function () {
            var value = this;

            return value.factory.createFloat(/^(\d|-\d)/.test(value.value) ? parseFloat(value.value) : 0);
        },

        coerceToInteger: function () {
            var value = this;

            return value.factory.createInteger(/^(\d|-\d)/.test(value.value) ? parseInt(value.value, 10) : 0);
        },

        coerceToKey: function () {
            return this;
        },

        coerceToNumber: function () {
            var value = this,
                isInteger = /^[^.eE]*$/.test(value.value);

            if (isInteger) {
                return value.coerceToInteger();
            } else {
                return value.coerceToFloat();
            }
        },

        coerceToString: function () {
            return this;
        },

        getConstantByName: function (name, namespaceScope) {
            var value = this,
                classObject = namespaceScope.getClass(value.value);

            return classObject.getConstantByName(name);
        },

        getElementByKey: function (key) {
            var keyValue,
                value = this;

            key = key.coerceToKey(value.callStack);

            if (!key) {
                // Could not be coerced to a key: error will already have been handled, just return NULL
                return new NullReference(value.factory);
            }

            keyValue = key.getNative();

            return value.factory.createString(value.value.charAt(keyValue));
        },

        getLength: function () {
            return this.value.length;
        },

        getStaticPropertyByName: function (nameValue, namespaceScope) {
            var value = this,
                classObject = namespaceScope.getClass(value.value);

            return classObject.getStaticPropertyByName(nameValue.getNative());
        },

        isEqualTo: function (rightValue) {
            return rightValue.isEqualToString(this);
        },

        isEqualToNull: function () {
            var value = this;

            return value.factory.createBoolean(value.getNative() === '');
        },

        isEqualToObject: function () {
            return this.factory.createBoolean(false);
        },

        isEqualToString: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(leftValue.value === rightValue.value);
        },

        onesComplement: function () {
            return this.factory.createString('?');
        }
    });

    return StringValue;
}, {strict: true});
