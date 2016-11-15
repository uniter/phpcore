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
    require('../Reference/Null'),
    require('../Value')
], function (
    _,
    phpCommon,
    util,
    NullReference,
    Value
) {
    var PHPError = phpCommon.PHPError;

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

        /**
         * Calls a static method of the class this string refers to
         *
         * @param {StringValue} nameValue
         * @param {Value[]} args
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @returns {Value}
         */
        callStaticMethod: function (nameValue, args, namespaceOrNamespaceScope) {
            var value = this,
                classObject = namespaceOrNamespaceScope.getGlobalNamespace().getClass(value.value);

            return classObject.callMethod(nameValue.getNative(), args);
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

        divide: function (rightValue) {
            return rightValue.divideByString(this);
        },

        divideByBoolean: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByFloat: function (leftValue) {
            var coercedLeftValue,
                rightValue = this,
                divisor = rightValue.coerceToNumber().getNative();

            if (divisor === 0) {
                rightValue.callStack.raiseError(PHPError.E_WARNING, 'Division by zero');

                return rightValue.factory.createBoolean(false);
            }

            coercedLeftValue = leftValue.coerceToNumber();

            return rightValue.factory.createFloat(coercedLeftValue.getNative() / divisor);
        },

        divideByInteger: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByNonArray: function (leftValue) {
            var coercedLeftValue,
                rightValue = this,
                divisorValue = rightValue.coerceToNumber(),
                quotient;

            if (divisorValue.getNative() === 0) {
                rightValue.callStack.raiseError(PHPError.E_WARNING, 'Division by zero');

                return rightValue.factory.createBoolean(false);
            }

            coercedLeftValue = leftValue.coerceToNumber();

            quotient = coercedLeftValue.getNative() / divisorValue.getNative();

            // Return result as a float if needed, otherwise keep as integer
            return Math.round(quotient) !== quotient || divisorValue.getType() === 'float' ?
                rightValue.factory.createFloat(quotient) :
                rightValue.factory.createInteger(quotient);
        },

        divideByNull: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByObject: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByString: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        formatAsString: function () {
            // To match Zend's output, simply wrap the string value in single-quotes,
            // leaving any embedded single-quotes unescaped
            return '\'' + this.value + '\'';
        },

        getCallableName: function () {
            // Strip any leading backslash off to normalise
            return this.value.replace(/^\\/, '');
        },

        /**
         * Fetches the value of a constant from the class this string refers to
         *
         * @param {string} name
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @returns {Value}
         */
        getConstantByName: function (name, namespaceOrNamespaceScope) {
            var value = this,
                classObject = namespaceOrNamespaceScope.getGlobalNamespace().getClass(value.value);

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

        /**
         * Fetches the value of a static property of the class this string refers to
         *
         * @param {StringValue} nameValue
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @returns {Value}
         */
        getStaticPropertyByName: function (nameValue, namespaceOrNamespaceScope) {
            var value = this,
                classObject = namespaceOrNamespaceScope.getGlobalNamespace().getClass(value.value);

            return classObject.getStaticPropertyByName(nameValue.getNative());
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfString(this);
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

        /**
         * Returns true if the string is numeric, false otherwise
         *
         * @returns {boolean}
         */
        isNumeric: function () {
            return /(\d+(\.)?)?\d+([Ee][+-]\d+)?/.test(this.value);
        },

        isTheClassOfArray: function () {
            return this.factory.createBoolean(false);
        },

        isTheClassOfBoolean: function () {
            return this.factory.createBoolean(false);
        },

        isTheClassOfFloat: function () {
            return this.factory.createBoolean(false);
        },

        isTheClassOfInteger: function () {
            return this.factory.createBoolean(false);
        },

        isTheClassOfNull: function () {
            return this.factory.createBoolean(false);
        },

        isTheClassOfObject: function (objectValue) {
            var rightValue = this;

            return rightValue.factory.createBoolean(
                objectValue.classIs(rightValue.value)
            );
        },

        isTheClassOfString: function () {
            return this.factory.createBoolean(false);
        },

        onesComplement: function () {
            return this.factory.createString('?');
        }
    });

    return StringValue;
}, {strict: true});
