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
    require('lie')
], function (
    _,
    phpCommon,
    Promise
) {
    var PHPError = phpCommon.PHPError,

        CLASS_NAME_NOT_VALID = 'core.class_name_not_valid',
        METHOD_CALLED_ON_NON_OBJECT = 'core.method_called_on_non_object',
        NON_OBJECT_METHOD_CALL = 'core.non_object_method_call',

        createNullReference = function (value) {
            var callStack = value.callStack;

            return value.referenceFactory.createNull({
                onSet: function () {
                    callStack.raiseError(PHPError.E_WARNING, 'Cannot use a scalar value as an array');
                }
            });
        },
        throwUnimplemented = function () {
            throw new Error('Unimplemented');
        };

    /**
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {string} type
     * @param {*} value
     * @abstract
     * @constructor
     */
    function Value(
        factory,
        referenceFactory,
        futureFactory,
        callStack,
        type,
        value
    ) {
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {ValueFactory}
         */
        this.factory = factory;
        /**
         * @type {FutureFactory}
         */
        this.futureFactory = futureFactory;
        /**
         * @type {ReferenceFactory}
         */
        this.referenceFactory = referenceFactory;
        /**
         * @type {string}
         */
        this.type = type;
        /**
         * @type {*}
         */
        this.value = value;
    }

    _.extend(Value.prototype, {
        /**
         * Adds this value to another
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        add: function (rightValue) {
            var leftValue = this,
                coercedLeftValue = leftValue.coerceToNumber(),
                coercedRightValue = rightValue.coerceToNumber();

            if (rightValue.isFuture()) {
                return rightValue.derive().next(function (rightValue) {
                    return leftValue.add(rightValue);
                });
            }

            return leftValue.factory.createArithmeticResult(
                coercedLeftValue,
                coercedRightValue,
                coercedLeftValue.getNative() + coercedRightValue.getNative()
            );
        },

        /**
         * Returns either a native or a Future-wrapped native for this value.
         *
         * @returns {Future<*>|*}
         */
        asEventualNative: function () {
            return this.getNative();
        },

        /**
         * Derives a Future from this value
         *
         * @returns {Future}
         */
        asFuture: function () {
            var value = this;

            return value.futureFactory.createPresent(value);
        },

        /**
         * Derives a value from this value (shared interface with Future)
         *
         * @returns {Value}
         */
        asValue: function () {
            return this;
        },

        /**
         * Calculates the bitwise-AND of this and a right-operand
         *
         * @param {Value} rightValue
         * @returns {IntegerValue}
         */
        bitwiseAnd: function (rightValue) {
            var leftValue = this;

            if (rightValue.isFuture()) {
                return rightValue.derive().next(function (rightValue) {
                    return leftValue.bitwiseAnd(rightValue);
                });
            }

            /*jshint bitwise:false */
            return leftValue.factory.createInteger(
                (
                    leftValue.coerceToInteger().getNative() & rightValue.coerceToInteger().getNative()
                ) >>> 0 // Force unsigned native JS number
            );
        },

        /**
         * Calculates the bitwise-OR of this and a right-operand
         *
         * @param {Value} rightValue
         * @returns {IntegerValue}
         */
        bitwiseOr: function (rightValue) {
            var leftValue = this;

            if (rightValue.isFuture()) {
                return rightValue.derive().next(function (rightValue) {
                    return leftValue.bitwiseOr(rightValue);
                });
            }

            /*jshint bitwise:false */
            return leftValue.factory.createInteger(
                (
                    leftValue.coerceToInteger().getNative() | rightValue.coerceToInteger().getNative()
                ) >>> 0 // Force unsigned native JS number
            );
        },

        /**
         * Calculates the bitwise-XOR of this and a right-operand
         *
         * @param {Value} rightValue
         * @returns {FutureValue|IntegerValue}
         */
        bitwiseXor: function (rightValue) {
            var leftValue = this;

            if (rightValue.isFuture()) {
                return rightValue.derive().next(function (rightValue) {
                    return leftValue.bitwiseXor(rightValue);
                });
            }

            /*jshint bitwise:false */
            return leftValue.factory.createInteger(
                (
                    leftValue.coerceToInteger().getNative() ^ rightValue.coerceToInteger().getNative()
                ) >>> 0 // Force unsigned native JS number
            );
        },

        /**
         * Calls this value, if it is callable
         *
         * @param {Reference[]|Value[]|Variable[]} args
         * @returns {Reference|Value}
         */
        call: throwUnimplemented,

        /**
         * Calls a method on an object
         *
         * @param {string} name
         */
        callMethod: function (name) {
            var value = this;

            value.callStack.raiseTranslatedError(PHPError.E_ERROR, NON_OBJECT_METHOD_CALL, {
                name: name,
                type: value.type
            });
        },

        /**
         * Calls a static method of a given class or the class of a given object
         */
        callStaticMethod: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        /**
         * Attaches a callback for when the value has resulted in an error. As present values
         * are already a present value, this simply ignores the given catch handler and returns the value unchanged.
         *
         * @returns {Value}
         */
        catch: function () {
            return this; // Fluent interface
        },

        /**
         * Returns a clone of this value, or throws an Error if not supported
         *
         * @throws {ObjectValue}
         */
        clone: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, METHOD_CALLED_ON_NON_OBJECT, {
                method: '__clone'
            });
        },

        /**
         * Coerces this value to an array. For all scalar types, the result will be wrapped
         * in an array using this default implementation.
         *
         * @returns {FloatValue}
         */
        coerceToArray: function () {
            var value = this;

            return value.factory.createArray([value]);
        },

        /**
         * Coerces this value to a number as a FloatValue
         *
         * @returns {FloatValue}
         */
        coerceToFloat: function () {
            var value = this;

            return value.factory.createFloat(Number(value.value));
        },

        /**
         * Coerces this value to an IntegerValue
         *
         * @returns {IntegerValue}
         */
        coerceToInteger: function () {
            var value = this;

            /*jshint bitwise:false */
            return value.factory.createInteger(Number(value.value) >>> 0);
        },

        /**
         * Unwraps an instance of Throwable to a native JS error
         *
         * @throws {Error}
         */
        coerceToNativeError: function () {
            // NB: This is actually only implemented by ObjectValue
            throw new Error('Only instances of Throwable may be thrown: tried to throw a(n) ' + this.type);
        },

        /**
         * Coerces this value to a number as an IntegerValue
         *
         * @returns {FloatValue|IntegerValue}
         */
        coerceToNumber: function () {
            return this.coerceToInteger();
        },

        coerceToObject: function () {
            var value = this,
                object = value.factory.createStdClassObject();

            /**
             * Scalars are coerced to objects as follows:
             *
             * > var_dump((object)21);
             *
             * object(stdClass)#1 (1) {
             *   ["scalar"]=>
             *   int(21)
             * }
             */
            object.getInstancePropertyByName(value.factory.createString('scalar')).setValue(value);

            return object;
        },

        coerceToString: throwUnimplemented,

        /**
         * Concatenates this value's string representation with the provided other value's
         *
         * @param {StringValue} rightValue
         * @returns {StringValue}
         */
        concat: function (rightValue) {
            var leftValue = this;

            if (rightValue.isFuture()) {
                return rightValue.derive().next(function (rightValue) {
                    return leftValue.concat(rightValue);
                });
            }

            return leftValue.factory.createString(
                leftValue.coerceToString().getNative() + rightValue.coerceToString().getNative()
            );
        },

        decrement: throwUnimplemented,

        /**
         * Derives a new value from this one that will be resumed/thrown-into
         * once the future value (or error result) is known. For a present value we will just
         * return itself, whereas for a future value we will return a new future
         * so that any handlers attached to it will not affect the original one.
         *
         * @returns {Value}
         */
        derive: function () {
            return this;
        },

        /**
         * Divides this value by another
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        divideBy: function (rightValue) {
            var leftValue = this,
                coercedLeftValue,
                coercedRightValue,
                divisor;

            if (rightValue.isFuture()) {
                return rightValue.derive().next(function (rightValue) {
                    return leftValue.divideBy(rightValue);
                });
            }

            coercedLeftValue = leftValue.coerceToNumber();
            coercedRightValue = rightValue.coerceToNumber();
            divisor = coercedRightValue.getNative();

            if (divisor === 0) {
                leftValue.callStack.raiseError(PHPError.E_WARNING, 'Division by zero');

                return leftValue.factory.createBoolean(false);
            }

            return leftValue.factory.createArithmeticResult(
                coercedLeftValue,
                coercedRightValue,
                coercedLeftValue.getNative() / divisor
            );
        },

        /**
         * Attaches a callback for when the value has been evaluated regardless of result or error.
         * As present values are already, this simply calls the handler synchronously.
         *
         * @param {Function} finallyHandler
         * @returns {Value}
         */
        finally: function (finallyHandler) {
            var value = this;

            finallyHandler(value);

            return value; // Fluent interface
        },

        /**
         * Formats the value for display in stack traces etc.
         *
         * @returns {string}
         */
        formatAsString: throwUnimplemented,

        getCallableName: throwUnimplemented,

        /**
         * Fetches a constant of a class by its name
         */
        getConstantByName: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        /**
         * Fetches the type of this value for display purposes, eg. "boolean"
         *
         * @returns {string}
         */
        getDisplayType: function () {
            return this.type;
        },

        getElementByKey: function () {
            return createNullReference(this);
        },

        getForAssignment: function () {
            return this;
        },

        getInstancePropertyByName: throwUnimplemented,

        getLength: function () {
            return this.coerceToString().getLength();
        },

        /**
         * Fetches a native representation of this value
         *
         * @returns {*}
         */
        getNative: function () {
            return this.value;
        },

        /**
         * Exports a "proxying" version of the native value. For normal primitive values
         * (string, boolean, int, float) this will just be the native value,
         * but for objects it will be an instance of PHPObject (see ObjectValue.prototype.getProxy())
         *
         * @returns {*}
         */
        getProxy: function () {
            return this.getNative();
        },

        /**
         * Fetches a special element that will append to the array
         *
         * @returns {ElementReference|NullReference}
         */
        getPushElement: function () {
            return createNullReference(this);
        },

        getReference: function () {
            throw new Error('Cannot get a reference to a value');
        },

        /**
         * Fetches a reference to a static property for a class by its name
         */
        getStaticPropertyByName: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        getType: function () {
            return this.type;
        },

        /**
         * Fetches the current value. Implemented by References, Variables and Values
         * for a consistent interface.
         *
         * @returns {Value}
         */
        getValue: function () {
            return this;
        },

        /**
         * Returns this value if defined (this is for the Reference/Value interface -
         * values are always classed as defined)
         *
         * @return {Value}
         */
        getValueOrNull: function () {
            return this;
        },

        /**
         * Coerces this value to a number and adds one to it
         *
         * @returns {Value}
         */
        increment: function () {
            var value = this;

            return value.factory.createInteger(value.getNative() + 1);
        },

        /**
         * Creates an instance of the class this value refers to
         *
         * @throws {PHPFatalError}
         */
        instantiate: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        isAnInstanceOf: throwUnimplemented,

        /**
         * Determines whether this value is callable
         *
         * @param {Namespace} globalNamespace
         * @returns {Future<boolean>}
         */
        isCallable: throwUnimplemented,

        /**
         * Determines whether this reference or value is defined
         * (always true for any value, including null)
         *
         * @returns {boolean}
         */
        isDefined: function () {
            return true;
        },

        /**
         * Determines whether this value is a future
         *
         * @returns {boolean}
         */
        isFuture: function () {
            return false;
        },

        /**
         * Determines whether this value is iterable
         *
         * @returns {boolean}
         */
        isIterable: throwUnimplemented,

        /**
         * Determines whether this value is the class of another value
         */
        isTheClassOfArray: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        /**
         * Determines whether this value is the class of another value
         */
        isTheClassOfBoolean: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        /**
         * Determines whether this value is the class of another value
         */
        isTheClassOfFloat: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        /**
         * Determines whether this value is the class of another value
         */
        isTheClassOfInteger: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        /**
         * Determines whether this value is the class of another value
         */
        isTheClassOfNull: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        /**
         * Determines whether this value is the class of another value
         */
        isTheClassOfObject: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        /**
         * Determines whether this value is the class of another value
         */
        isTheClassOfString: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        /**
         * Determines whether the value is classed as "empty" or not
         *
         * @returns {Future<boolean>}
         */
        isEmpty: throwUnimplemented,

        /**
         * Determines whether this value is loosely equal to the provided other value
         *
         * @param {Value} rightValue
         * @returns {BooleanValue}
         */
        isEqualTo: function (rightValue) {
            /*jshint eqeqeq:false */
            var leftValue = this;

            if (rightValue.isFuture()) {
                return rightValue.derive().next(function (rightValue) {
                    return leftValue.isEqualTo(rightValue);
                });
            }

            // TODO: Investigate whether JS and PHP loose equality semantics are close enough (eg. octal?)
            return leftValue.factory.createBoolean(rightValue.value == leftValue.value);
        },

        /**
         * Determines whether this value is loosely equal to the provided array value
         *
         * @param {ArrayValue} rightValue
         * @returns {BooleanValue}
         */
        isEqualToArray: function (rightValue) {
            return this.isEqualTo(rightValue);
        },

        /**
         * Determines whether this value is loosely equal to the provided boolean value
         *
         * @param {BooleanValue} rightValue
         * @returns {BooleanValue}
         */
        isEqualToBoolean: function (rightValue) {
            return this.isEqualTo(rightValue);
        },

        /**
         * Determines whether this value is loosely equal to the provided float value
         *
         * @param {FloatValue} rightValue
         * @returns {BooleanValue}
         */
        isEqualToFloat: function (rightValue) {
            return this.isEqualTo(rightValue);
        },

        /**
         * Determines whether this value is loosely equal to the provided integer value
         *
         * @param {IntegerValue} rightValue
         * @returns {BooleanValue}
         */
        isEqualToInteger: function (rightValue) {
            return this.isEqualTo(rightValue);
        },

        /**
         * Determines whether this value is loosely equal to the provided null value
         *
         * @param {NullValue} rightValue
         * @returns {BooleanValue}
         */
        isEqualToNull: function (rightValue) {
            return this.isEqualTo(rightValue);
        },

        /**
         * Determines whether this value is loosely equal to the provided object value
         *
         * @param {ObjectValue} rightValue
         * @returns {BooleanValue}
         */
        isEqualToObject: function (rightValue) {
            return this.isEqualTo(rightValue);
        },

        /**
         * Determines whether this value is loosely equal to the provided string value
         *
         * @param {StringValue} rightValue
         * @returns {BooleanValue}
         */
        isEqualToString: function (rightValue) {
            return this.isEqualTo(rightValue);
        },

        /**
         * Compares this value to another value, returning bool(true)
         * if this value is greater than the other and false otherwise
         *
         * @param {Value} rightValue
         * @returns {BooleanValue}
         */
        isGreaterThan: function (rightValue) {
            var leftValue = this,
                factory = leftValue.factory;

            return factory.createBoolean(
                leftValue.coerceToNumber().getNative() > rightValue.coerceToNumber().getNative()
            );
        },

        /**
         * Compares this value to another value, returning bool(true)
         * if this value is greater than or equal to the other and false otherwise
         *
         * @param {Value} rightValue
         * @returns {BooleanValue}
         */
        isGreaterThanOrEqual: function (rightValue) {
            var leftValue = this,
                factory = leftValue.factory;

            return factory.createBoolean(
                leftValue.coerceToNumber().getNative() >= rightValue.coerceToNumber().getNative()
            );
        },

        /**
         * Determines whether this value is strictly equal
         * to the provided other value
         *
         * @param {Value} rightValue
         * @returns {BooleanValue}
         */
        isIdenticalTo: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(
                rightValue.type === leftValue.type &&
                rightValue.value === leftValue.value
            );
        },

        /**
         * Determines whether this value is strictly equal
         * to the provided array value
         *
         * @param {ArrayValue} rightValue
         * @returns {BooleanValue}
         */
        isIdenticalToArray: function (rightValue) {
            return this.isIdenticalTo(rightValue);
        },

        /**
         * Determines whether this value is strictly equal
         * to the provided object value
         *
         * @param {ObjectValue} rightValue
         * @returns {BooleanValue}
         */
        isIdenticalToObject: function (rightValue) {
            return this.isIdenticalTo(rightValue);
        },

        /**
         * Compares this value to another value, returning bool(true)
         * if this value is less than the other and false otherwise
         *
         * @param {Value} rightValue
         * @returns {BooleanValue}
         */
        isLessThan: function (rightValue) {
            var leftValue = this,
                factory = leftValue.factory;

            return factory.createBoolean(
                leftValue.coerceToNumber().getNative() < rightValue.coerceToNumber().getNative()
            );
        },

        /**
         * Compares this value to another value, returning bool(true)
         * if this value is less than or equal to the other and false otherwise
         *
         * @param {Value} rightValue
         * @returns {BooleanValue}
         */
        isLessThanOrEqual: function (rightValue) {
            var leftValue = this,
                factory = leftValue.factory;

            return factory.createBoolean(
                leftValue.coerceToNumber().getNative() <= rightValue.coerceToNumber().getNative()
            );
        },

        /**
         * Loosely compares this value to the provided other value,
         * returning true if they are not equal and false otherwise
         *
         * @param {Reference|Value} rightValue
         * @returns {BooleanValue}
         */
        isNotEqualTo: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(!leftValue.isEqualTo(rightValue).getNative());
        },

        /**
         * Strictly compares this value to the provided other value,
         * returning true if they are not of the same type
         * or of the same type but with a different value,
         * and false otherwise
         *
         * @param {Reference|Value} rightValue
         * @returns {BooleanValue}
         */
        isNotIdenticalTo: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(!leftValue.isIdenticalTo(rightValue).getNative());
        },

        /**
         * Returns true if this value is numeric and false otherwise
         *
         * @returns {boolean}
         */
        isNumeric: throwUnimplemented,

        /**
         * Determines whether this value is classed as "set" or not
         *
         * @returns {Future<boolean>}
         */
        isSet: function () {
            // All values except NULL are classed as 'set'
            return this.futureFactory.createPresent(true);
        },

        /**
         * Performs a logical-AND of this value and the other value given
         *
         * @param {Reference|Value} rightValue
         * @returns {BooleanValue}
         */
        logicalAnd: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(
                leftValue.coerceToBoolean().getNative() &&
                rightValue.coerceToBoolean().getNative()
            );
        },

        /**
         * Performs a logical-NOT of this value.
         * If this value is truthy this will return false,
         * otherwise if falsy it will return true
         *
         * @returns {BooleanValue}
         */
        logicalNot: function () {
            var value = this;

            return value.factory.createBoolean(!value.coerceToBoolean().getNative());
        },

        /**
         * Calculates the modulo (remainder of an integer division) of this value with another
         *
         * @param {Value} rightValue
         * @returns {IntegerValue}
         */
        modulo: function (rightValue) {
            var value = this,
                // Coerce both operands to integers first, to ensure an integer division
                dividend = value.coerceToInteger().getNative(),
                divisor = rightValue.coerceToInteger().getNative();

            if (divisor === 0) {
                value.callStack.raiseError(PHPError.E_WARNING, 'Division by zero');

                return value.factory.createBoolean(false);
            }

            return value.factory.createInteger(dividend % divisor);
        },

        /**
         * Multiplies this value with another
         *
         * @param {Value} multiplierValue
         * @returns {Value}
         */
        multiplyBy: function (multiplierValue) {
            var multiplicandValue = this,
                coercedMultiplicandValue,
                coercedMultiplierValue,
                product;

            if (multiplierValue.isFuture()) {
                return multiplierValue.derive().next(function (multiplierValue) {
                    return multiplicandValue.multiplyBy(multiplierValue);
                });
            }

            coercedMultiplicandValue = multiplicandValue.coerceToNumber();
            coercedMultiplierValue = multiplierValue.coerceToNumber();
            product = coercedMultiplicandValue.getNative() * coercedMultiplierValue.getNative();

            return multiplicandValue.factory.createArithmeticResult(
                coercedMultiplicandValue,
                coercedMultiplierValue,
                product
            );
        },

        /**
         * Negates the current value arithmetically, inverting its sign and returning
         * either a FloatValue or IntegerValue as appropriate
         *
         * @returns {FloatValue|IntegerValue}
         */
        negate: function () {
            var value = this,
                coercedValue = value.coerceToNumber();

            return value.factory.createArithmeticResult(coercedValue, coercedValue, -coercedValue.getNative());
        },

        /**
         * Attaches a callback for when the value has been evaluated. As present values
         * are already, this simply calls the resume handler synchronously and ignores
         * the catch handler as there will never be an error involved here.
         * Note that the FutureValue class will override this method with support
         * for the catch handler parameter.
         *
         * @param {Function} resumeHandler
         * @returns {FutureValue|Value}
         */
        next: function (resumeHandler) {
            var value = this,
                result;

            try {
                result = resumeHandler(value);
            } catch (error) {
                return value.factory.createRejection(error);
            }

            result = value.factory.coerce(result);

            return result;
        },

        /**
         * Bitwise-shifts this value left by the given number of bits
         *
         * @param {Value} rightValue
         * @returns {IntegerValue|FutureValue<IntegerValue>}
         */
        shiftLeft: function (rightValue) {
            /*jshint bitwise: false */
            var leftValue = this,
                factory = leftValue.factory,
                coercedRightValue = rightValue.coerceToInteger(),
                coercedLeftValue = leftValue.coerceToInteger();

            if (rightValue.isFuture()) {
                return rightValue.derive().next(function (rightValue) {
                    return leftValue.shiftLeft(rightValue);
                });
            }

            return factory.createInteger(coercedLeftValue.getNative() << coercedRightValue.getNative());
        },

        /**
         * Bitwise-shifts this value right by the given number of bits
         *
         * @param {Value} rightValue
         * @returns {IntegerValue|FutureValue<IntegerValue>}
         */
        shiftRight: function (rightValue) {
            /*jshint bitwise: false */
            var leftValue = this,
                factory = leftValue.factory,
                coercedRightValue = rightValue.coerceToInteger(),
                coercedLeftValue = leftValue.coerceToInteger();

            if (rightValue.isFuture()) {
                return rightValue.derive().next(function (rightValue) {
                    return leftValue.shiftRight(rightValue);
                });
            }

            return factory.createInteger(coercedLeftValue.getNative() >> coercedRightValue.getNative());
        },

        /**
         * Subtracts another value from this one
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        subtract: function (rightValue) {
            var leftValue = this,
                coercedLeftValue = leftValue.coerceToNumber(),
                coercedRightValue = rightValue.coerceToNumber();

            if (rightValue.isFuture()) {
                return rightValue.derive().next(function (rightValue) {
                    return leftValue.subtract(rightValue);
                });
            }

            return leftValue.factory.createArithmeticResult(
                coercedLeftValue,
                coercedRightValue,
                coercedLeftValue.getNative() - coercedRightValue.getNative()
            );
        },

        /**
         * Derives a promise of this value (shared interface with Future)
         *
         * @returns {Promise<Value>}
         */
        toPromise: function () {
            return Promise.resolve(this);
        },

        /**
         * Either returns this value if it is present, or raises a Pause if it is a future,
         * to allow it to be resolved to a present value
         *
         * @returns {Value}
         * @throws {Pause}
         */
        yield: function () {
            return this;
        },

        /**
         * Fetches the present value synchronously
         *
         * @returns {Value}
         */
        yieldSync: function () {
            return this;
        }
    });

    return Value;
}, {strict: true});
