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
    /**
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {string} value
     * @param {Namespace} globalNamespace
     * @constructor
     */
    function StringValue(factory, referenceFactory, futureFactory, callStack, value, globalNamespace) {
        Value.call(this, factory, referenceFactory, futureFactory, callStack, 'string', value);

        /**
         * @type {Namespace}
         */
        this.globalNamespace = globalNamespace;
    }

    util.inherits(StringValue, Value);

    _.extend(StringValue.prototype, {
        /**
         * Calls a function or static method based on the contents of the string
         *
         * @param {Value[]} args
         * @returns {Value}
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

                // Note that this may return a FutureValue due to autoloading.
                return classNameValue.callStaticMethod(methodNameValue, args);
            }

            // Otherwise must just be the name of a function
            return value.globalNamespace.getFunction(value.value).apply(null, args);
        },

        /**
         * Calls a static method of the class this string refers to
         *
         * @param {StringValue} nameValue
         * @param {Value[]} args
         * @param {bool=} isForwarding eg. self::f() is forwarding, MyParentClass::f() is non-forwarding
         * @returns {FutureValue}
         */
        callStaticMethod: function (nameValue, args, isForwarding) {
            var value = this;

            // Note that this may pause due to autoloading
            return value.factory.createFuture(function (resolve, reject) {
                value.globalNamespace.getClass(value.value)
                    .next(function (classObject) {
                        classObject.callMethod(nameValue.getNative(), args, null, null, null, !!isForwarding)
                            .next(resolve, reject);
                    }, reject);
            });
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
         * {@inheritdoc}
         */
        decrement: function () {
            var value = this;

            return value.coerceToNumber().subtract(value.factory.createInteger(1));
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
         * @returns {FutureValue}
         */
        getConstantByName: function (name) {
            var value = this;

            // Note that this may pause due to autoloading
            return value.factory.createFuture(function (resolve, reject) {
                value.globalNamespace.getClass(value.value)
                    .next(function (classObject) {
                        resolve(classObject.getConstantByName(name));
                    }, reject);
            });
        },

        getElementByKey: function (key) {
            var keyValue,
                value = this;

            key = key.coerceToKey(value.callStack);

            if (!key) {
                // Could not be coerced to a key: error will already have been handled, just return NULL
                return value.referenceFactory.createNull();
            }

            keyValue = key.getNative();

            return value.factory.createString(value.value.charAt(keyValue));
        },

        getLength: function () {
            return this.value.length;
        },

        /**
         * Fetches a reference to a static property of the class this string refers to
         *
         * @param {StringValue} nameValue
         * @returns {Future<StaticPropertyReference|UndeclaredStaticPropertyReference>}
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
            var value = this;

            return value.coerceToNumber().add(value.factory.createInteger(1));
        },

        /**
         * Creates an instance of the class this string contains the FQCN of
         *
         * @param {Value[]} args
         * @returns {FutureValue<ObjectValue>}
         */
        instantiate: function (args) {
            var value = this;

            // Note that this may pause due to autoloading
            return value.globalNamespace.getClass(value.value)
                .next(function (classObject) {
                    return classObject.instantiate(args);
                })
                .asValue();
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
         * @returns {Future<boolean>}
         */
        isEmpty: function () {
            var value = this;

            // NB: string("0.0") is _not_ classed as empty
            return value.futureFactory.createPresent(value.value === '' || value.value === '0');
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

        onesComplement: function () {
            return this.factory.createString('?');
        }
    });

    return StringValue;
}, {strict: true});
