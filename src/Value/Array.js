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
    require('phpcommon'),
    require('util'),
    require('../Reference/Element'),
    require('../KeyValuePair'),
    require('../Reference/Null'),
    require('../Value'),
    require('../Variable')
], function (
    _,
    phpCommon,
    util,
    ElementReference,
    KeyValuePair,
    NullReference,
    Value,
    Variable
) {
    var hasOwn = {}.hasOwnProperty,
        PHPError = phpCommon.PHPError,
        PHPFatalError = phpCommon.PHPFatalError;

    function ArrayValue(factory, callStack, orderedElements, type) {
        var elements = [],
            keysToElements = [],
            value = this;

        _.each(orderedElements, function (element, key) {
            if (element instanceof KeyValuePair) {
                key = element.getKey();
                element = element.getValue();
            } else {
                if (_.isNumber(key)) {
                    key = factory.createInteger(keysToElements.length);
                } else {
                    key = factory.createFromNative(key);
                }

                if (element instanceof Variable) {
                    element = element.getValue();
                } else {
                    element = factory.coerce(element);
                }
            }

            element = new ElementReference(factory, callStack, value, key, element);

            elements.push(element);
            keysToElements[key.getNative()] = element;
        });

        Value.call(this, factory, callStack, type || 'array', elements);

        this.keysToElements = keysToElements;
        this.pointer = 0;
    }

    util.inherits(ArrayValue, Value);

    _.extend(ArrayValue.prototype, {
        add: function (rightValue) {
            return rightValue.addToArray(this);
        },

        addToArray: function (leftValue) {
            var rightValue = this,
                resultArray = leftValue.clone();

            _.forOwn(rightValue.keysToElements, function (element, key) {
                if (!hasOwn.call(resultArray.keysToElements, key)) {
                    resultArray.getElementByKey(element.getKey()).setValue(element.getValue());
                }
            });

            return resultArray;
        },

        addToBoolean: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        addToFloat: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        addToInteger: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        addToNull: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        addToObject: function (objectValue) {
            return objectValue.addToArray(this);
        },

        addToString: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        call: function (args, namespaceOrNamespaceScope) {
            var value = this.value;

            if (value.length < 2) {
                throw new PHPFatalError(PHPFatalError.FUNCTION_NAME_MUST_BE_STRING);
            }

            return value[0].getValue().callMethod(value[1].getValue().getNative(), args, namespaceOrNamespaceScope);
        },

        clone: function () {
            var arrayValue = this,
                orderedElements = [];

            _.each(arrayValue.value, function (element) {
                if (element.isDefined()) {
                    orderedElements.push(new KeyValuePair(element.getKey(), element.getValue()));
                }
            });

            return new ArrayValue(arrayValue.factory, arrayValue.callStack, orderedElements, arrayValue.type);
        },

        coerceToArray: function () {
            return this;
        },

        coerceToBoolean: function () {
            var value = this;

            return value.factory.createBoolean(value.value.length > 0);
        },

        coerceToInteger: function () {
            var value = this;

            return value.factory.createInteger(value.value.length === 0 ? 0 : 1);
        },

        coerceToKey: function () {
            this.callStack.raiseError(PHPError.E_WARNING, 'Illegal offset type');
        },

        coerceToNumber: function () {
            return this.coerceToInteger();
        },

        coerceToString: function () {
            return this.factory.createString('Array');
        },

        getForAssignment: function () {
            return this.clone();
        },

        getKeys: function () {
            var keys = [];

            _.each(this.value, function (element) {
                keys.push(element.getKey());
            });

            return keys;
        },

        getNative: function () {
            var result = [];

            _.each(this.value, function (element) {
                result[element.getKey().getNative()] = element.getValue().getNative();
            });

            return result;
        },

        getCurrentElement: function () {
            var value = this;

            return value.value[value.pointer] || value.factory.createNull();
        },

        getElementByKey: function (key) {
            var element,
                keyValue,
                value = this;

            key = key.coerceToKey(value.callStack);

            if (!key) {
                // Could not be coerced to a key: error will already have been handled, just return NULL
                return new NullReference(value.factory);
            }

            keyValue = key.getNative();

            if (!hasOwn.call(value.keysToElements, keyValue)) {
                element = new ElementReference(value.factory, value.callStack, value, key, null);

                value.value.push(element);
                value.keysToElements[keyValue] = element;
            }

            return value.keysToElements[keyValue];
        },

        getElementByIndex: function (index) {
            var value = this;

            return value.value[index] || (function () {
                    value.callStack.raiseError(PHPError.E_NOTICE, 'Undefined ' + value.referToElement(index));

                    return new NullReference(value.factory);
                }());
        },

        getKeyByIndex: function (index) {
            var value = this,
                element = value.value[index];

            return element ? element.key : null;
        },

        getLength: function () {
            return this.value.length;
        },

        getPointer: function () {
            return this.pointer;
        },

        getValues: function () {
            var values = [];

            _.each(this.value, function (element) {
                values.push(element.getValue());
            });

            return values;
        },

        isEqualTo: function (rightValue) {
            return rightValue.isEqualToArray(this);
        },

        isEqualToNull: function () {
            var value = this;

            return value.factory.createBoolean(value.value.length === 0);
        },

        isEqualToArray: function (rightValue) {
            var equal = true,
                leftValue = this,
                factory = leftValue.factory;

            if (rightValue.value.length !== leftValue.value.length) {
                return factory.createBoolean(false);
            }

            _.forOwn(rightValue.keysToElements, function (element, nativeKey) {
                if (!hasOwn.call(leftValue.keysToElements, nativeKey) || element.getValue().isNotEqualTo(leftValue.keysToElements[nativeKey].getValue()).getNative()) {
                    equal = false;
                    return false;
                }
            });

            return factory.createBoolean(equal);
        },

        isEqualToBoolean: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(rightValue.getNative() === (leftValue.value.length > 0));
        },

        isEqualToFloat: function () {
            return this.factory.createBoolean(false);
        },

        isEqualToInteger: function () {
            return this.factory.createBoolean(false);
        },

        isEqualToObject: function () {
            return this.factory.createBoolean(false);
        },

        isEqualToString: function () {
            return this.factory.createBoolean(false);
        },

        isIdenticalTo: function (rightValue) {
            return rightValue.isIdenticalToArray(this);
        },

        isIdenticalToArray: function (rightValue) {
            var identical = true,
                leftValue = this,
                factory = leftValue.factory;

            if (rightValue.value.length !== leftValue.value.length) {
                return factory.createBoolean(false);
            }

            _.each(rightValue.value, function (element, index) {
                if (
                    leftValue.value[index].getKey().isNotIdenticalTo(element.getKey()).getNative() ||
                    leftValue.value[index].getValue().isNotIdenticalTo(element.getValue()).getNative()
                ) {
                    identical = false;
                    return false;
                }
            });

            return factory.createBoolean(identical);
        },

        next: function () {
            this.pointer++;
        },

        onesComplement: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        push: function (otherValue) {
            var value = this,
                index = value.factory.createInteger(value.getLength());

            value.getElementByKey(index).setValue(otherValue);

            return value;
        },

        referToElement: function (key) {
            return 'offset: ' + key;
        },

        reset: function () {
            var value = this;

            value.pointer = 0;

            return value;
        },

        setPointer: function (pointer) {
            this.pointer = pointer;
        },

        shiftLeftBy: function (rightValue) {
            return this.coerceToInteger().shiftLeftBy(rightValue);
        },

        shiftRightBy: function (rightValue) {
            return this.coerceToInteger().shiftRightBy(rightValue);
        }
    });

    return ArrayValue;
}, {strict: true});
