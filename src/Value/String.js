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
    var Exception = phpCommon.Exception,
        MAGIC_TO_STRING = '__toString',
        PHPError = phpCommon.PHPError,
        NON_NUMERIC_VALUE = 'core.non_numeric_value';

    /**
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {Flow} flow
     * @param {string} value
     * @param {Namespace} globalNamespace
     * @param {NumericStringParser} numericStringParser
     * @constructor
     */
    function StringValue(
        factory,
        referenceFactory,
        futureFactory,
        callStack,
        flow,
        value,
        globalNamespace,
        numericStringParser
    ) {
        Value.call(this, factory, referenceFactory, futureFactory, callStack, flow, 'string', value);

        /**
         * @type {Namespace}
         */
        this.globalNamespace = globalNamespace;
        /**
         * @type {NumericStringParser}
         */
        this.numericStringParser = numericStringParser;
    }

    util.inherits(StringValue, Value);

    _.extend(StringValue.prototype, {
        /**
         * Calls a function or static method based on the contents of the string.
         *
         * @param {Value[]} args
         * @returns {ChainableInterface<Reference|Value|Variable>}
         */
        call: function (args) {
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

                // Note that this may return a Future-wrapped Value due to autoloading.
                return classNameValue.callStaticMethod(methodNameValue, args);
            }

            // Otherwise must just be the name of a function
            return value.globalNamespace.getFunction(value.value).apply(null, args);
        },

        /**
         * Calls a static method of the class this string refers to.
         *
         * @param {StringValue} nameValue
         * @param {Value[]} args
         * @param {bool=} isForwarding eg. self::f() is forwarding, MyParentClass::f() is non-forwarding
         * @returns {ChainableInterface<Reference|Value|Variable>}
         */
        callStaticMethod: function (nameValue, args, isForwarding) {
            var value = this;

            // Note that this may pause due to autoloading.
            return value.globalNamespace.getClass(value.value)
                .next(function (classObject) {
                    return classObject.callMethod(nameValue.getNative(), args, null, null, null, !!isForwarding);
                });
        },

        /**
         * {@inheritdoc}
         */
        coerceToBoolean: function () {
            return this.factory.createBoolean(this.value !== '' && this.value !== '0');
        },

        /**
         * Coerces this string to a float value.
         *
         * @returns {FloatValue}
         */
        coerceToFloat: function () {
            var value = this,
                parse = value.numericStringParser.parseNumericString(value.value);

            return parse ? parse.toFloatValue() : value.factory.createFloat(0);
        },

        /**
         * Coerces this string to an integer value.
         *
         * @returns {IntegerValue}
         */
        coerceToInteger: function () {
            var value = this,
                parse = value.numericStringParser.parseNumericString(value.value);

            return parse ? parse.toIntegerValue() : value.factory.createInteger(0);
        },

        coerceToKey: function () {
            return this;
        },

        /**
         * {@inheritdoc}
         */
        coerceToNumber: function () {
            var value = this,
                parse = value.numericStringParser.parseNumericString(value.value);

            if (!parse) {
                // Return null if the string is completely non-numeric.
                return null;
            }

            if (!parse.isFullyNumeric()) {
                /*
                 * Raise a warning if the value is only leading-numeric.
                 *
                 * Note that this will mean raising the same warning twice if both operands
                 * of an operation with two are non-numeric, as expected.
                 */
                value.callStack.raiseTranslatedError(PHPError.E_WARNING, NON_NUMERIC_VALUE);
            }

            return parse.toValue();
        },

        coerceToString: function () {
            return this;
        },

        /**
         * {@inheritdoc}
         */
        compareWith: function (rightValue) {
            return rightValue.compareWithString(this);
        },

        /**
         * {@inheritdoc}
         */
        compareWithArray: function () {
            // Arrays (even empty ones) are always greater (except for objects).
            return this.futureFactory.createPresent(1);
        },

        /**
         * {@inheritdoc}
         */
        compareWithBoolean: function (leftValue) {
            var rightValue = this,
                leftBoolean = leftValue.getNative(),
                rightBoolean = rightValue.coerceToBoolean().getNative();

            if (!leftBoolean && rightBoolean) {
                return -1;
            }

            if (leftBoolean && !rightBoolean) {
                return 1;
            }

            return 0;
        },

        /**
         * {@inheritdoc}
         */
        compareWithFloat: function (leftValue) {
            var rightValue = this,
                leftFloat = leftValue.getNative(),
                rightFloat = rightValue.coerceToFloat().getNative();

            if (leftFloat < rightFloat) {
                return -1;
            }

            if (leftFloat > rightFloat) {
                return 1;
            }

            return 0;
        },

        /**
         * {@inheritdoc}
         */
        compareWithInteger: function (leftValue) {
            var rightValue = this,
                leftFloat = leftValue.coerceToFloat().getNative(),
                rightFloat = rightValue.coerceToFloat().getNative();

            if (leftFloat < rightFloat) {
                return -1;
            }

            if (leftFloat > rightFloat) {
                return 1;
            }

            return 0;
        },

        /**
         * {@inheritdoc}
         */
        compareWithNull: function () {
            var rightStringIsEmpty = this.getNative() === '';

            // The empty string is equal to null, any other string is greater.
            return rightStringIsEmpty ? 0 : -1;
        },

        /**
         * {@inheritdoc}
         */
        compareWithObject: function (leftValue) {
            var rightValue = this;

            if (!leftValue.isMethodDefined(MAGIC_TO_STRING)) {
                // Objects (even empty ones) are always greater.
                return rightValue.futureFactory.createPresent(1);
            }

            return leftValue.callMethod(MAGIC_TO_STRING)
                .next(function (leftStringValue) {
                    return leftStringValue.compareWithString(rightValue);
                });
        },

        /**
         * {@inheritdoc}
         */
        compareWithResource: function (leftValue) {
            // Compare resources by their globally unique IDs.
            var leftResourceID = leftValue.getID(),
                rightInteger = this.coerceToInteger().getNative();

            if (leftResourceID < rightInteger) {
                return -1;
            }

            if (leftResourceID > rightInteger) {
                return 1;
            }

            return 0;
        },

        /**
         * {@inheritdoc}
         */
        compareWithString: function (leftValue) {
            var leftString = leftValue.getNative(),
                rightValue = this,
                rightString = rightValue.getNative();

            if (leftValue.isNumeric() && rightValue.isNumeric()) {
                // Both operands are numeric strings, so the comparison is done numerically.
                return rightValue.futureFactory.createPresent(
                    rightValue.coerceToFloat().compareWithFloat(leftValue.coerceToFloat())
                );
            }

            // Otherwise do a lexical comparison.
            return rightValue.futureFactory.createPresent(leftString.localeCompare(rightString));
        },

        /**
         * {@inheritdoc}
         */
        convertForBooleanType: function () {
            return this.coerceToBoolean();
        },

        /**
         * {@inheritdoc}
         */
        convertForFloatType: function () {
            var value = this,
                parse = value.numericStringParser.parseNumericString(value.value);

            // Only leading and/or trailing whitespace may be allowed present if any.
            return parse && parse.isFullyNumeric() ?
                parse.toFloatValue() :
                value;
        },

        /**
         * {@inheritdoc}
         */
        convertForIntegerType: function () {
            var value = this,
                parse = value.numericStringParser.parseNumericString(value.value);

            // Only leading and/or trailing whitespace may be allowed present if any.
            return parse && parse.isFullyNumeric() ?
                parse.toIntegerValue() :
                value;
        },

        /**
         * {@inheritdoc}
         */
        decrement: function () {
            var value = this,
                numberString = value.value,
                parse;

            if (numberString === '') {
                // Special case: empty string is treated as zero, which is decremented to -1.
                return value.factory.createInteger(-1);
            }

            parse = value.numericStringParser.parseNumericString(numberString);

            if (parse === null || !parse.isFullyNumeric()) {
                // Non-numeric or only leading-numeric string; nothing to do, return the string unchanged.
                // Note that unlike for incrementing, there are no alphanumeric decrement rules.
                return value;
            }

            return parse.toValue().subtract(value.factory.createInteger(1));
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
         * Fetches the value of a constant from the class this string refers to.
         *
         * @param {string} name
         * @returns {ChainableInterface<Value>}
         */
        getConstantByName: function (name) {
            var value = this;

            if (name.toLowerCase() === 'class') {
                /*
                 * The special MyClass::class constant that fetches the FQCN of the class as a string.
                 * Note that this constant is case-insensitive while all others are not.
                 *
                 * If the class is not defined, it will not be autoloaded.
                 */
                return value.factory.createString(value.value);
            }

            // Note that this may pause due to autoloading
            return value.globalNamespace.getClass(value.value)
                .next(function (classObject) {
                    return classObject.getConstantByName(name);
                });
        },

        /**
         * {@inheritdoc}
         */
        getElementByKey: function (key) {
            var keyValue,
                value = this;

            key = key.coerceToKey(value.callStack);

            if (!key) {
                // Could not be coerced to a key: error will already have been handled, just return NULL
                return value.referenceFactory.createNull();
            }

            keyValue = key.getNative();

            // TODO: String indices should also be writable.
            //       Consider a copy-on-write StringValueProxy wrapper.
            return value.referenceFactory.createAccessor(
                function () {
                    return value.factory.createString(value.value.charAt(keyValue));
                },
                function () {
                    throw new Exception('Assigning to a string offset is not yet supported');
                }
            );
        },

        getLength: function () {
            return this.value.length;
        },

        /**
         * Determines the numeric type of this string:
         *
         * - "float"
         * - "int"
         * - or null if not numeric.
         *
         * @returns {string|null}
         */
        getNumericType: function () {
            var value = this,
                parse = value.numericStringParser.parseNumericString(value.value);

            return parse ? parse.getType() : null;
        },

        /**
         * Fetches a reference to a static property of the class this string refers to.
         *
         * @param {StringValue} nameValue
         * @returns {ChainableInterface<StaticPropertyReference|UndeclaredStaticPropertyReference>}
         */
        getStaticPropertyByName: function (nameValue) {
            var value = this;

            // Note that this may pause due to autoloading
            return value.globalNamespace.getClass(value.value)
                .next(function (classObject) {
                    return classObject.getStaticPropertyByName(nameValue.getNative());
                });
        },

        /**
         * {@inheritdoc}
         */
        increment: function () {
            var value = this,
                numberString = value.value,
                parse = value.numericStringParser.parseNumericString(numberString);

            if (parse === null || !parse.isFullyNumeric()) {
                // Non-numeric or only leading-numeric string; apply alphanumeric increment rules.
                numberString = value.numericStringParser.incrementAlphanumericString(numberString);

                return value.factory.createString(numberString);
            }

            return parse.toValue().add(value.factory.createInteger(1));
        },

        /**
         * Creates an instance of the class this string contains the FQCN of
         *
         * @param {Value[]} args
         * @returns {ChainableInterface<ObjectValue>}
         */
        instantiate: function (args) {
            var value = this;

            // Note that this may pause due to autoloading
            return value.globalNamespace.getClass(value.value)
                .next(function (classObject) {
                    return classObject.instantiate(args);
                });
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfString(this);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function (globalNamespace) {
            // Must just be the name of a function or static method - as this is a normal string
            // and not a bareword, it should just be resolved as a FQCN
            // and not relative to the current namespace scope

            var className,
                classObjectFuture,
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

                classObjectFuture = globalNamespace.getClass(className);

                return classObjectFuture.next(function (classObject) {
                    return classObject.getMethodSpec(methodName) !== null;
                }, function () {
                    return false; // Class could not be found, so method must be uncallable.
                });
            }

            return value.futureFactory.createPresent(globalNamespace.hasFunction(value.value));
        },

        /**
         * Determines whether this value is classed as "empty" or not
         *
         * @returns {ChainableInterface<boolean>}
         */
        isEmpty: function () {
            var value = this;

            // NB: string("0.0") is _not_ classed as empty
            return value.futureFactory.createPresent(value.value === '' || value.value === '0');
        },

        /**
         * {@inheritdoc}
         */
        isIterable: function () {
            return false;
        },

        /**
         * Returns true if the string is fully (not just leading-) numeric, false otherwise.
         *
         * @returns {boolean}
         */
        isNumeric: function () {
            var value = this,
                parse = value.numericStringParser.parseNumericString(value.value);

            return Boolean(parse && parse.isFullyNumeric());
        },

        /**
         * {@inheritdoc}
         */
        isScalar: function () {
            return true;
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
         * {@inheritdoc}
         */
        onesComplement: function () {
            /*jshint bitwise: false */
            var value = this,
                transformed = value.value
                    .split('')
                    .map(function (char) {
                        // For strings, we perform ones' complement on the ASCII values of the characters.
                        return String.fromCharCode((~char.charCodeAt(0)) & 0xff);
                    })
                    .join('');

            return this.factory.createString(transformed);
        }
    });

    return StringValue;
}, {strict: true});
