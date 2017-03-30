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
    require('./Reference/Null')
], function (
    _,
    phpCommon,
    NullReference
) {
    var PHPError = phpCommon.PHPError,
        PHPFatalError = phpCommon.PHPFatalError,
        createNullReference = function (value) {
            var callStack = value.callStack;

            return new NullReference(value.factory, {
                onSet: function () {
                    callStack.raiseError(PHPError.E_WARNING, 'Cannot use a scalar value as an array');
                }
            });
        },
        throwUnimplemented = function () {
            throw new Error('Unimplemented');
        };

    function Value(factory, callStack, type, value) {
        this.factory = factory;
        this.callStack = callStack;
        this.type = type;
        this.value = value;
    }

    _.extend(Value.prototype, {
        addToArray: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        addToFloat: function (floatValue) {
            var leftValue = this;

            // Coerce to float and return a float if either operand is a float
            return leftValue.factory.createFloat(leftValue.coerceToFloat().getNative() + floatValue.getNative());
        },

        addToNull: function () {
            return this;
        },

        addToString: function (stringValue) {
            return stringValue.coerceToNumber().add(this.coerceToNumber());
        },

        /**
         * Calculates the bitwise-AND of this and a right-operand
         *
         * @param {Value} rightValue
         * @returns {IntegerValue}
         */
        bitwiseAnd: function (rightValue) {
            var value = this;

            /*jshint bitwise:false */
            return value.factory.createInteger(
                (
                    value.coerceToInteger().getNative() & rightValue.coerceToInteger().getNative()
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
            var value = this;

            /*jshint bitwise:false */
            return value.factory.createInteger(
                (
                    value.coerceToInteger().getNative() | rightValue.coerceToInteger().getNative()
                ) >>> 0 // Force unsigned native JS number
            );
        },

        callMethod: function (name) {
            throw new PHPFatalError(PHPFatalError.NON_OBJECT_METHOD_CALL, {
                name: name
            });
        },

        callStaticMethod: function () {
            throw new PHPFatalError(PHPFatalError.CLASS_NAME_NOT_VALID);
        },

        /**
         * Coerces this value to an array. For all Value types except ArrayValue,
         * the result will be wrapped in an array using this default implementation
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
         * Coerces this value to a number as a FloatValue
         *
         * @returns {FloatValue}
         */
        coerceToNumber: function () {
            return this.coerceToFloat();
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

        concat: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createString(
                leftValue.coerceToString().getNative() + rightValue.coerceToString().getNative()
            );
        },

        /**
         * Divides this value by another
         */
        divide: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Divides an array value by this one
         */
        divideByArray: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Divides a boolean value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        divideByBoolean: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        /**
         * Divides a float value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        divideByFloat: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        /**
         * Divides an integer value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        divideByInteger: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        /**
         * Divides a non-array value by this value
         *
         * @throws {PHPFatalError}
         */
        divideByNonArray: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Divides a null value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        divideByNull: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        /**
         * Divides an object value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        divideByObject: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        /**
         * Divides a string value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        divideByString: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        getCallableName: throwUnimplemented,

        getConstantByName: function () {
            throw new PHPFatalError(PHPFatalError.CLASS_NAME_NOT_VALID);
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

        getNative: function () {
            return this.value;
        },

        getPushElement: function () {
            return createNullReference(this);
        },

        getReference: function () {
            throw new PHPFatalError(PHPFatalError.ONLY_VARIABLES_BY_REFERENCE);
        },

        getStaticPropertyByName: function () {
            throw new PHPFatalError(PHPFatalError.CLASS_NAME_NOT_VALID);
        },

        getType: function () {
            return this.type;
        },

        getValue: function () {
            return this;
        },

        /**
         * Creates an instance of the class this value refers to
         *
         * @throws {PHPFatalError}
         */
        instantiate: function () {
            throw new PHPFatalError(PHPFatalError.CLASS_NAME_NOT_VALID);
        },

        isAnInstanceOf: throwUnimplemented,

        isTheClassOfArray: function () {
            throw new PHPFatalError(PHPFatalError.CLASS_NAME_NOT_VALID);
        },

        isTheClassOfBoolean: function () {
            throw new PHPFatalError(PHPFatalError.CLASS_NAME_NOT_VALID);
        },

        isTheClassOfFloat: function () {
            throw new PHPFatalError(PHPFatalError.CLASS_NAME_NOT_VALID);
        },

        isTheClassOfInteger: function () {
            throw new PHPFatalError(PHPFatalError.CLASS_NAME_NOT_VALID);
        },

        isTheClassOfNull: function () {
            throw new PHPFatalError(PHPFatalError.CLASS_NAME_NOT_VALID);
        },

        isTheClassOfObject: function () {
            throw new PHPFatalError(PHPFatalError.CLASS_NAME_NOT_VALID);
        },

        isTheClassOfString: function () {
            throw new PHPFatalError(PHPFatalError.CLASS_NAME_NOT_VALID);
        },

        /**
         * Determines whether the value is classed as "empty" or not
         *
         * @returns {boolean}
         */
        isEmpty: throwUnimplemented,

        isEqualTo: function (rightValue) {
            /*jshint eqeqeq:false */
            var leftValue = this;

            return leftValue.factory.createBoolean(rightValue.value == leftValue.value);
        },

        isEqualToArray: function (rightValue) {
            return this.isEqualTo(rightValue);
        },

        isEqualToFloat: function (rightValue) {
            return this.isEqualTo(rightValue);
        },

        isEqualToInteger: function (rightValue) {
            return this.isEqualTo(rightValue);
        },

        isEqualToNull: function (rightValue) {
            return this.isEqualTo(rightValue);
        },

        isEqualToObject: function (rightValue) {
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

        isIdenticalTo: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(
                rightValue.type === leftValue.type &&
                rightValue.value === leftValue.value
            );
        },

        isIdenticalToArray: function (rightValue) {
            return this.isIdenticalTo(rightValue);
        },

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

        isNotEqualTo: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(!leftValue.isEqualTo(rightValue).getNative());
        },

        isNotIdenticalTo: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(!leftValue.isIdenticalTo(rightValue).getNative());
        },

        isNumeric: throwUnimplemented,

        isSet: function () {
            // All values except NULL are classed as 'set'
            return true;
        },

        logicalAnd: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(
                leftValue.coerceToBoolean().getNative() &&
                rightValue.coerceToBoolean().getNative()
            );
        },

        logicalNot: function () {
            var value = this;

            return value.factory.createBoolean(!value.coerceToBoolean().getNative());
        },

        /**
         * Multiplies this value with another
         */
        multiply: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Multiplies an array value by this value
         *
         * @throws {PHPFatalError}
         */
        multiplyByArray: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Multiplies a boolean value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        multiplyByBoolean: function (leftValue) {
            return this.multiplyByNonArray(leftValue);
        },

        /**
         * Multiplies a float value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        multiplyByFloat: function (leftValue) {
            return this.multiplyByNonArray(leftValue);
        },

        /**
         * Multiplies an integer value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        multiplyByInteger: function (leftValue) {
            return this.multiplyByNonArray(leftValue);
        },

        /**
         * Multiplies a non-array value by this value
         *
         * @throws {PHPFatalError}
         */
        multiplyByNonArray: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Multiplies a null value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        multiplyByNull: function (leftValue) {
            return this.multiplyByNonArray(leftValue);
        },

        /**
         * Multiplies an object value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        multiplyByObject: function (leftValue) {
            return this.multiplyByNonArray(leftValue);
        },

        /**
         * Multiplies a string value by this value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        multiplyByString: function (leftValue) {
            return this.multiplyByNonArray(leftValue);
        },

        subtractFromNull: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        }
    });

    return Value;
}, {strict: true});
