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

        /**
         * Calls a function or static method based on the contents of the string
         *
         * @param {Value[]} args
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @returns {Value}
         */
        call: function (args, namespaceOrNamespaceScope) {
            var classNameValue,
                match,
                methodNameValue,
                value = this;

            if (value.value.indexOf('::') > -1) {
                /**
                 * Handle static method call format:
                 *
                 *     $func = 'My\Stuff\MyClass::myStaticMethod';
                 *     $func(...);
                 */
                match = value.value.match(/(.*)::(.*)/);

                classNameValue = value.factory.createString(match[1]);
                methodNameValue = value.factory.createString(match[2]);

                return classNameValue.callStaticMethod(
                    methodNameValue,
                    args,
                    namespaceOrNamespaceScope
                );
            }

            // Otherwise must just be the name of a function
            return namespaceOrNamespaceScope.getGlobalNamespace().getFunction(value.value).apply(null, args);
        },

        /**
         * Calls a static method of the class this string refers to
         *
         * @param {StringValue} nameValue
         * @param {Value[]} args
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @param {bool=} isForwarding eg. self::f() is forwarding, MyParentClass::f() is non-forwarding
         * @returns {Value}
         */
        callStaticMethod: function (nameValue, args, namespaceOrNamespaceScope, isForwarding) {
            var value = this,
                classObject = namespaceOrNamespaceScope.getGlobalNamespace().getClass(value.value);

            return classObject.callMethod(nameValue.getNative(), args, null, null, null, !!isForwarding);
        },

        coerceToBoolean: function () {
            return this.factory.createBoolean(this.value !== '' && this.value !== '0');
        },

        /**
         * Coerces this string to a float value
         *
         * @returns {FloatValue}
         */
        coerceToFloat: function () {
            var value = this;

            return value.factory.createFloat(/^(\d|-[\d.])/.test(value.value) ? parseFloat(value.value) : 0);
        },

        /**
         * Coerces this string to an integer value
         *
         * @returns {IntegerValue}
         */
        coerceToInteger: function () {
            var value = this;

            return value.factory.createInteger(/^(\d|-[\d.])/.test(value.value) ? parseInt(value.value, 10) : 0);
        },

        coerceToKey: function () {
            return this;
        },

        /**
         * Coerces this string to either a FloatValue or IntegerValue, depending on its contents
         *
         * @returns {FloatValue|IntegerValue}
         */
        coerceToNumber: function () {
            var value = this,
                isFloat = /^-?\d*(\.|[eE][-+]?)\d/.test(value.value);

            if (isFloat) {
                return value.coerceToFloat();
            } else {
                return value.coerceToInteger();
            }
        },

        coerceToString: function () {
            return this;
        },

        /**
         * Divides this string by another value
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        divide: function (rightValue) {
            return rightValue.divideByString(this);
        },

        /**
         * Divides a float by this string
         *
         * @param {FloatValue} leftValue
         * @returns {Value}
         */
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

        /**
         * Divides a non-array value by this string
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
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

        /**
         * Formats the string for display in stack traces etc.
         *
         * @returns {string}
         */
        formatAsString: function () {
            // To match Zend's output, simply wrap the string value in single-quotes,
            // leaving any embedded single-quotes unescaped
            var textValue = this.value;

            if (textValue.length > 15) {
                // Truncate long strings to improve readability (as per Zend's output)
                textValue = textValue.substr(0, 15) + '...';
            }

            return '\'' + textValue + '\'';
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

        /**
         * Creates an instance of the class this string contains the FQCN of
         *
         * @param {Value[]} args
         * @param {NamespaceScope} namespaceScope
         * @returns {ObjectValue}
         */
        instantiate: function (args, namespaceScope) {
            var value = this,
                classObject = namespaceScope.getGlobalNamespace().getClass(value.value);

            return classObject.instantiate(args);
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfString(this);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function (namespaceScope) {
            // Must just be the name of a function or static method - as this is a normal string
            // and not a bareword, it should just be resolved as a FQCN
            // and not relative to the current namespace scope

            var className,
                classObject,
                globalNamespace = namespaceScope.getGlobalNamespace(),
                match,
                methodName,
                value = this;

            if (value.value.indexOf('::') > -1) {
                /**
                 * Handle static method call format:
                 *
                 *     $func = 'My\Stuff\MyClass::myStaticMethod';
                 *     $func(...);
                 */
                match = value.value.match(/(.*)::(.*)/);

                className = match[1];
                methodName = match[2];

                if (!globalNamespace.hasClass(className)) {
                    return false;
                }

                classObject = globalNamespace.getClass(className);

                return classObject.getMethodSpec(methodName) !== null;
            }

            return globalNamespace.hasFunction(value.value);
        },

        /**
         * Determines whether this value is classed as "empty" or not
         *
         * @returns {boolean}
         */
        isEmpty: function () {
            var value = this;

            // NB: string("0.0") is _not_ classed as empty
            return value.value === '' || value.value === '0';
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
         * {@inheritdoc}
         */
        isIterable: function () {
            return false;
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

        /**
         * Multiplies this string by another value
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        multiply: function (rightValue) {
            return rightValue.multiplyByString(this);
        },

        /**
         * Multiplies a float by this string
         *
         * @param {FloatValue} leftValue
         * @returns {Value}
         */
        multiplyByFloat: function (leftValue) {
            var coercedMultiplicandValue = leftValue.coerceToNumber(),
                rightValue = this,
                multiplier = rightValue.coerceToNumber().getNative();

            return rightValue.factory.createFloat(coercedMultiplicandValue.getNative() * multiplier);
        },

        /**
         * Multiplies a non-array value by this string
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        multiplyByNonArray: function (leftValue) {
            var coercedMultiplicandValue = leftValue.coerceToNumber(),
                rightValue = this,
                coercedMultiplierValue = rightValue.coerceToNumber(),
                product = coercedMultiplicandValue.getNative() * coercedMultiplierValue.getNative();

            // Return result as a float if either coerced operand is a float, otherwise keep as integer
            return coercedMultiplicandValue.getType() === 'float' || coercedMultiplierValue.getType() === 'float' ?
                rightValue.factory.createFloat(product) :
                rightValue.factory.createInteger(product);
        },

        onesComplement: function () {
            return this.factory.createString('?');
        }
    });

    return StringValue;
}, {strict: true});
