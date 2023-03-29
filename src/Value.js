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

        CANNOT_PERFORM_BITWISE_NOT = 'core.cannot_perform_bitwise_not',
        CLASS_NAME_NOT_VALID = 'core.class_name_not_valid',
        METHOD_CALLED_ON_NON_OBJECT = 'core.method_called_on_non_object',
        NON_OBJECT_METHOD_CALL = 'core.non_object_method_call',
        UNSUPPORTED_OPERAND_TYPES = 'core.unsupported_operand_types',
        VALUE_NOT_CALLABLE = 'core.value_not_callable',

        createNullReference = function (value) {
            var callStack = value.callStack;

            return value.referenceFactory.createNull({
                onSet: function () {
                    callStack.raiseError(PHPError.E_WARNING, 'Cannot use a scalar value as an array');
                }
            });
        },

        /**
         * Generates a function that will throw to indicate an unimplemented method when called.
         *
         * @param {string} functionName
         * @returns {Function}
         */
        throwUnimplemented = function (functionName) {
            return function () {
                throw new Error(functionName + '() :: Not implemented');
            };
        };

    /**
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {Flow} flow
     * @param {string} type
     * @param {*} value
     * @abstract
     * @constructor
     * @implements {ChainableInterface}
     */
    function Value(
        factory,
        referenceFactory,
        futureFactory,
        callStack,
        flow,
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
         * @type {Flow}
         */
        this.flow = flow;
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

            if (!coercedLeftValue || !coercedRightValue) {
                leftValue.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    UNSUPPORTED_OPERAND_TYPES,
                    {
                        left: leftValue.getDisplayType(),
                        operator: '+',
                        right: rightValue.getDisplayType()
                    },
                    'TypeError'
                );
            }

            return leftValue.factory.createArithmeticResult(
                coercedLeftValue,
                coercedRightValue,
                coercedLeftValue.getNative() + coercedRightValue.getNative()
            );
        },

        /**
         * Returns this value as an array element.
         *
         * @returns {ChainableInterface<Value>}
         */
        asArrayElement: function () {
            return this.getForAssignment();
        },

        /**
         * Returns a Future that will resolve to the native value of this value.
         *
         * @returns {ChainableInterface<*>}
         */
        asEventualNative: function () {
            var value = this;

            return value.futureFactory.createPresent(value.getNative());
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
         * {@inheritdoc}
         */
        asValue: function () {
            return this;
        },

        /**
         * Calculates the bitwise-AND of this and a right-operand.
         *
         * @param {Value} rightValue
         * @returns {IntegerValue}
         */
        bitwiseAnd: function (rightValue) {
            var leftValue = this,
                coercedLeftValue = leftValue.coerceToNumber(),
                coercedRightValue = rightValue.coerceToNumber();

            if (!coercedLeftValue || !coercedRightValue) {
                leftValue.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    UNSUPPORTED_OPERAND_TYPES,
                    {
                        left: leftValue.getDisplayType(),
                        operator: '&',
                        right: rightValue.getDisplayType()
                    },
                    'TypeError'
                );
            }

            /*jshint bitwise:false */
            return leftValue.factory.createInteger(
                (
                    coercedLeftValue.getNative() & coercedRightValue.getNative()
                ) >>> 0 // Force unsigned native JS number.
            );
        },

        /**
         * Calculates the bitwise-OR of this and a right-operand.
         *
         * @param {Value} rightValue
         * @returns {IntegerValue}
         */
        bitwiseOr: function (rightValue) {
            var leftValue = this,
                coercedLeftValue = leftValue.coerceToNumber(),
                coercedRightValue = rightValue.coerceToNumber();

            if (!coercedLeftValue || !coercedRightValue) {
                leftValue.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    UNSUPPORTED_OPERAND_TYPES,
                    {
                        left: leftValue.getDisplayType(),
                        operator: '|',
                        right: rightValue.getDisplayType()
                    },
                    'TypeError'
                );
            }

            /*jshint bitwise:false */
            return leftValue.factory.createInteger(
                (
                    coercedLeftValue.getNative() | coercedRightValue.getNative()
                ) >>> 0 // Force unsigned native JS number.
            );
        },

        /**
         * Calculates the bitwise-XOR of this and a right-operand.
         *
         * @param {Value} rightValue
         * @returns {IntegerValue}
         */
        bitwiseXor: function (rightValue) {
            var leftValue = this,
                coercedLeftValue = leftValue.coerceToNumber(),
                coercedRightValue = rightValue.coerceToNumber();

            if (!coercedLeftValue || !coercedRightValue) {
                leftValue.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    UNSUPPORTED_OPERAND_TYPES,
                    {
                        left: leftValue.getDisplayType(),
                        operator: '^',
                        right: rightValue.getDisplayType()
                    },
                    'TypeError'
                );
            }

            /*jshint bitwise:false */
            return leftValue.factory.createInteger(
                (
                    coercedLeftValue.getNative() ^ coercedRightValue.getNative()
                ) >>> 0 // Force unsigned native JS number.
            );
        },

        /**
         * Calls this value, if it is callable.
         *
         * @param {Reference[]|Value[]|Variable[]} args
         * @returns {ChainableInterface<Reference|Value|Variable>}
         */
        call: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, VALUE_NOT_CALLABLE, {
                'type': this.type
            });
        },

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
         * Attaches a callback for when the value has resulted in an error. As present values
         * are already a present value, this simply ignores the given catch handler and does nothing.
         *
         * Note that this does not return a Value for chaining.
         *
         * Note that .next()/.catch()/.finally() should usually be used for chaining,
         * this is a low-level function.
         */
        catchIsolated: function () {
            // Nothing to do, no handler to call and chaining is not possible.
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
         * @returns {ArrayValue}
         */
        coerceToArray: function () {
            var value = this;

            return value.factory.createArray([value]);
        },

        /**
         * Coerces this value to a BooleanValue.
         *
         * @returns {BooleanValue}
         */
        coerceToBoolean: throwUnimplemented('coerceToBoolean'),

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
         * Coerces this value to a valid element key. Note that when an element of an ObjectValue
         * is being fetched (which therefore means it must implement ArrayAccess), this method is not used
         * because any value is a valid key (or "offset").
         *
         * @returns {Value}
         */
        coerceToKey: throwUnimplemented('coerceToKey'),

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
         * Coerces this value to a number as either a FloatValue or IntegerValue if possible.
         * If the value is completely non-numeric, null will be returned.
         *
         * @returns {FloatValue|IntegerValue|null}
         */
        coerceToNumber: function () {
            return null;
        },

        /**
         * Coerces this value to an object as an ObjectValue.
         *
         * @returns {ChainableInterface<ObjectValue>}
         */
        coerceToObject: function () {
            var value = this;

            return value.factory.createStdClassObject().next(function (objectValue) {
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
                return objectValue.getInstancePropertyByName(value.factory.createString('scalar'))
                    .setValue(value)
                    .next(function () {
                        // Discard the result of the setter, we have awaited it if needed,
                        // and return the created ObjectValue.
                        return objectValue;
                    });
            });
        },

        /**
         * Coerces this value to a string, if possible.
         *
         * @returns {ChainableInterface<StringValue>}
         */
        coerceToString: throwUnimplemented('coerceToString'),

        /**
         * Loosely compares this value with the given other value.
         * Returns -1, 0 or 1 if this value is less-than, equal-to or greater-than the other respectively.
         * Returns null if the values cannot be compared.
         *
         * @param {Value} rightValue
         * @returns {ChainableInterface<number|null>}
         */
        compareWith: throwUnimplemented('compareWith'),

        /**
         * Loosely compares this value with the given ArrayValue.
         * Returns -1, 0 or 1 if this value is less-than, equal-to or greater-than the other respectively.
         *
         * @param {ArrayValue} leftValue
         * @returns {ChainableInterface<number>}
         */
        compareWithArray: throwUnimplemented('compareWithArray'),

        /**
         * Loosely compares this value with the given BooleanValue.
         * Returns -1, 0 or 1 if this value is less-than, equal-to or greater-than the other respectively.
         *
         * @param {BooleanValue} leftValue
         * @returns {number}
         */
        compareWithBoolean: throwUnimplemented('compareWithBoolean'),

        /**
         * Loosely compares this value with the given FloatValue.
         * Returns -1, 0 or 1 if this value is less-than, equal-to or greater-than the other respectively.
         *
         * @param {FloatValue} leftValue
         * @returns {number}
         */
        compareWithFloat: throwUnimplemented('compareWithFloat'),

        /**
         * Loosely compares this value with the given IntegerValue.
         * Returns -1, 0 or 1 if this value is less-than, equal-to or greater-than the other respectively.
         *
         * @param {IntegerValue} leftValue
         * @returns {number}
         */
        compareWithInteger: throwUnimplemented('compareWithInteger'),

        /**
         * Loosely compares this value with the given NullValue.
         * Returns -1, 0 or 1 if this value is less-than, equal-to or greater-than the other respectively.
         *
         * @param {NullValue} leftValue
         * @returns {number}
         */
        compareWithNull: throwUnimplemented('compareWithNull'),

        /**
         * Loosely compares this value with the given ObjectValue.
         * Returns -1, 0 or 1 if this value is less-than, equal-to or greater-than the other respectively.
         *
         * Returns null if the objects are of different classes and therefore cannot be compared.
         *
         * @param {ObjectValue} leftValue
         * @returns {ChainableInterface<number|null>}
         */
        compareWithObject: throwUnimplemented('compareWithObject'),

        /**
         * Loosely compares this value with the given ResourceValue.
         * Returns -1, 0 or 1 if this value is less-than, equal-to or greater-than the other respectively.
         *
         * @param {ResourceValue} leftValue
         * @returns {number}
         */
        compareWithResource: throwUnimplemented('compareWithResource'),

        /**
         * Loosely compares this value with the given StringValue.
         * Returns -1, 0 or 1 if this value is less-than, equal-to or greater-than the other respectively.
         *
         * @param {StringValue} leftValue
         * @returns {ChainableInterface<number>}
         */
        compareWithString: throwUnimplemented('compareWithString'),

        /**
         * Concatenates this value's string representation with the provided other value's
         *
         * @param {StringValue} rightValue
         * @returns {ChainableInterface<StringValue>}
         */
        concat: function (rightValue) {
            var leftValue = this;

            // Either operand could coerce to a future, e.g. if an ObjectValue implementing ->__toString().
            return leftValue.coerceToString().next(function (coercedLeftValue) {
                return rightValue.coerceToString().next(function (coercedRightValue) {
                    return leftValue.factory.createString(
                        coercedLeftValue.getNative() + coercedRightValue.getNative()
                    );
                });
            });
        },

        /**
         * Converts this value for a boolean type hint. If it cannot be successfully converted,
         * the value is returned unchanged. Used by scalar type hinting.
         *
         * @returns {Value}
         */
        convertForBooleanType: function () {
            return this;
        },

        /**
         * Converts this value for a float type hint. If it cannot be successfully converted,
         * the value is returned unchanged. Used by scalar type hinting.
         *
         * @returns {Value}
         */
        convertForFloatType: function () {
            return this;
        },

        /**
         * Converts this value for an integer type hint. If it cannot be successfully converted,
         * the value is returned unchanged. Used by scalar type hinting.
         *
         * @returns {Value}
         */
        convertForIntegerType: function () {
            return this;
        },

        /**
         * Converts this value for a string type hint. If it cannot be successfully converted,
         * the value is returned unchanged. Used by scalar type hinting.
         *
         * @returns {Value}
         */
        convertForStringType: function () {
            return this;
        },

        /**
         * Coerces this value to a number and subtracts one from it.
         *
         * @returns {ChainableInterface<Value>}
         */
        decrement: function () {
            var value = this;

            return value.factory.createInteger(value.getNative() - 1);
        },

        /**
         * Divides this value by another.
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        divideBy: function (rightValue) {
            var leftValue = this,
                coercedLeftValue = leftValue.coerceToNumber(),
                coercedRightValue = rightValue.coerceToNumber(),
                divisor;

            if (!coercedLeftValue || !coercedRightValue) {
                leftValue.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    UNSUPPORTED_OPERAND_TYPES,
                    {
                        left: leftValue.getDisplayType(),
                        operator: '/',
                        right: rightValue.getDisplayType()
                    },
                    'TypeError'
                );
            }

            divisor = coercedRightValue.getNative();

            if (divisor === 0) {
                // TODO: Should raise a new DivisionByZeroError in PHP 7+.
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
        formatAsString: throwUnimplemented('formatAsString'),

        /**
         * Generates a string representing how this value could be called.
         *
         * @returns {string}
         */
        getCallableName: throwUnimplemented('getCallableName'),

        /**
         * Fetches a constant of a class by its name
         */
        getConstantByName: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        /**
         * Fetches the type of this value for display purposes, e.g. "int".
         *
         * @returns {string}
         */
        getDisplayType: function () {
            return this.type;
        },

        /**
         * Fetches an element of this value.
         *
         * @param {number} index
         * @returns {Reference}
         */
        getElementByIndex: throwUnimplemented('getElementByIndex'),

        /**
         * Fetches an element of this value, as used by the array element dereference syntax $value[$element].
         *
         * @returns {AccessorReference|ElementReference|NullReference|ObjectElement}
         */
        getElementByKey: function () {
            return createNullReference(this);
        },

        getForAssignment: function () {
            return this;
        },

        /**
         * Fetches an instance property of this object by its name.
         *
         * @param {Reference|Value|Variable} nameReference
         * @returns {NullReference|PropertyReference|Reference}
         */
        getInstancePropertyByName: throwUnimplemented('getInstancePropertyByName'),

        /**
         * Fetches an appropriate iterator for this value, if any.
         *
         * @returns {ChainableInterface<ArrayIterator|ObjectValue>}
         */
        getIterator: throwUnimplemented('getIterator'),

        /**
         * Fetches an element or property of this value by its index.
         *
         * @param {number} index
         * @returns {Value|null}
         */
        getKeyByIndex: throwUnimplemented('getKeyByIndex'),

        getLength: function () {
            return this.coerceToString().getLength();
        },

        /**
         * Fetches a native representation of this value. Note that if this value
         * contains any references that return Future(Values), an error will be raised.
         *
         * @see .asEventualNative() if any descendant of this value may return any Future(Value)s.
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
         * @returns {ElementReference|NullReference|ObjectElement}
         */
        getPushElement: function () {
            return createNullReference(this);
        },

        getReference: function () {
            throw new Error('Cannot get a reference to a value');
        },

        /**
         * Fetches a reference to a static property for a class by its name.
         *
         * @returns {ChainableInterface<StaticPropertyReference>}
         */
        getStaticPropertyByName: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NAME_NOT_VALID);
        },

        /**
         * Fetches the exit code for an exit value, if any, otherwise 0.
         *
         * @returns {number}
         */
        getStatus: throwUnimplemented('getStatus'),

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
         * Coerces the value to a float or int as appropriate, if applicable.
         *
         * @returns {Value}
         */
        identity: function () {
            var value = this,
                numberValue = value.coerceToNumber();

            if (numberValue !== null) {
                // Value was successfully coerced to either a FloatValue or IntegerValue.
                return numberValue;
            }

            // Error message treats the operation as "... * 1".
            value.callStack.raiseTranslatedError(
                PHPError.E_ERROR,
                UNSUPPORTED_OPERAND_TYPES,
                {
                    left: value.getDisplayType(),
                    operator: '*',
                    right: 'int'
                },
                'TypeError'
            );
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

        /**
         * Determines whether this value is an instance of the given class or interface.
         *
         * @param {Reference|Value|Variable} classNameReference
         * @returns {BooleanValue}
         */
        isAnInstanceOf: throwUnimplemented('isAnInstanceOf'),

        /**
         * Determines whether this value is callable
         *
         * @param {Namespace} globalNamespace
         * @returns {ChainableInterface<boolean>}
         */
        isCallable: throwUnimplemented('isCallable'),

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
        isIterable: throwUnimplemented('isIterable'),

        /**
         * Determines whether this value may be referenced (shared interface with Reference and Variable).
         *
         * Values are never referenceable as they are the result of a dereference.
         *
         * @returns {boolean}
         */
        isReferenceable: function () {
            return false;
        },

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
         * @returns {ChainableInterface<boolean>}
         */
        isEmpty: throwUnimplemented('isEmpty'),

        /**
         * Determines whether this value is loosely equal to the provided other value.
         *
         * @param {Value} rightValue
         * @returns {ChainableInterface<BooleanValue>}
         */
        isEqualTo: function (rightValue) {
            return this.compareWith(rightValue)
                .next(function (comparisonResult) {
                    return comparisonResult === 0;
                })
                .asValue();
        },

        /**
         * Compares this value to another value, returning bool(true)
         * if this value is greater than the other and false otherwise.
         *
         * @param {Value} rightValue
         * @returns {ChainableInterface<BooleanValue>}
         */
        isGreaterThan: function (rightValue) {
            return this.compareWith(rightValue)
                .next(function (comparisonResult) {
                    return comparisonResult === 1;
                })
                .asValue();
        },

        /**
         * Compares this value to another value, returning bool(true)
         * if this value is greater than or equal to the other and false otherwise.
         *
         * @param {Value} rightValue
         * @returns {ChainableInterface<BooleanValue>}
         */
        isGreaterThanOrEqual: function (rightValue) {
            return this.compareWith(rightValue)
                .next(function (comparisonResult) {
                    // Don't allow the null case.
                    return comparisonResult === 1 || comparisonResult === 0;
                })
                .asValue();
        },

        /**
         * Determines whether this value is strictly equal
         * to the provided other value.
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
         * to the provided array value.
         *
         * @param {ArrayValue} rightValue
         * @returns {BooleanValue}
         */
        isIdenticalToArray: function (rightValue) {
            return this.isIdenticalTo(rightValue);
        },

        /**
         * Determines whether this value is strictly equal
         * to the provided object value.
         *
         * @param {ObjectValue} rightValue
         * @returns {BooleanValue}
         */
        isIdenticalToObject: function (rightValue) {
            return this.isIdenticalTo(rightValue);
        },

        /**
         * Determines whether this value is strictly equal
         * to the provided resource value.
         *
         * @param {ResourceValue} rightValue
         * @returns {BooleanValue}
         */
        isIdenticalToResource: function (rightValue) {
            return this.isIdenticalTo(rightValue);
        },

        /**
         * Compares this value to another value, returning bool(true)
         * if this value is less than the other and false otherwise.
         *
         * @param {Value} rightValue
         * @returns {ChainableInterface<BooleanValue>}
         */
        isLessThan: function (rightValue) {
            return this.compareWith(rightValue)
                .next(function (comparisonResult) {
                    return comparisonResult === -1;
                })
                .asValue();
        },

        /**
         * Compares this value to another value, returning bool(true)
         * if this value is less than or equal to the other and false otherwise.
         *
         * @param {Value} rightValue
         * @returns {ChainableInterface<BooleanValue>}
         */
        isLessThanOrEqual: function (rightValue) {
            return this.compareWith(rightValue)
                .next(function (comparisonResult) {
                    // Don't allow the null case.
                    return comparisonResult === -1 || comparisonResult === 0;
                })
                .asValue();
        },

        /**
         * Loosely compares this value to the provided other value,
         * returning true if they are not equal and false otherwise.
         *
         * @param {Reference|Value} rightValue
         * @returns {ChainableInterface<BooleanValue>}
         */
        isNotEqualTo: function (rightValue) {
            return this.compareWith(rightValue)
                .next(function (comparisonResult) {
                    // Allow the null case.
                    return comparisonResult !== 0;
                })
                .asValue();
        },

        /**
         * Strictly compares this value to the provided other value,
         * returning true if they are not of the same type
         * or of the same type but with a different value,
         * and false otherwise.
         *
         * @param {Reference|Value} rightValue
         * @returns {BooleanValue}
         */
        isNotIdenticalTo: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(!leftValue.isIdenticalTo(rightValue).getNative());
        },

        /**
         * Returns true if this value is numeric and false otherwise.
         *
         * @returns {boolean}
         */
        isNumeric: throwUnimplemented('isNumeric'),

        /**
         * Determines whether this value is scalar or not.
         *
         * @returns {boolean}
         */
        isScalar: function () {
            return false;
        },

        /**
         * Determines whether this value is classed as "set" or not
         *
         * @returns {ChainableInterface<boolean>}
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
         * Calculates the modulo (remainder of an integer division) of this value with another.
         *
         * @param {Value} rightValue
         * @returns {BooleanValue|IntegerValue}
         */
        modulo: function (rightValue) {
            var leftValue = this,
                coercedLeftValue = leftValue.coerceToNumber(),
                coercedRightValue = rightValue.coerceToNumber(),
                dividend,
                divisor;

            if (!coercedLeftValue || !coercedRightValue) {
                leftValue.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    UNSUPPORTED_OPERAND_TYPES,
                    {
                        left: leftValue.getDisplayType(),
                        operator: '%',
                        right: rightValue.getDisplayType()
                    },
                    'TypeError'
                );
            }

            // Coerce both operands to integers first, to ensure an integer division.
            dividend = coercedLeftValue.coerceToInteger().getNative();
            divisor = coercedRightValue.coerceToInteger().getNative();

            if (divisor === 0) {
                // TODO: Should raise a new DivisionByZeroError with message "Modulo by zero" in PHP 7+.
                leftValue.callStack.raiseError(PHPError.E_WARNING, 'Division by zero');

                return leftValue.factory.createBoolean(false);
            }

            return leftValue.factory.createInteger(dividend % divisor);
        },

        /**
         * Multiplies this value with another.
         *
         * @param {Value} multiplierValue
         * @returns {Value}
         */
        multiplyBy: function (multiplierValue) {
            var multiplicandValue = this,
                coercedMultiplicandValue = multiplicandValue.coerceToNumber(),
                coercedMultiplierValue = multiplierValue.coerceToNumber(),
                product;

            if (!coercedMultiplicandValue || !coercedMultiplierValue) {
                multiplicandValue.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    UNSUPPORTED_OPERAND_TYPES,
                    {
                        left: multiplicandValue.getDisplayType(),
                        operator: '*',
                        right: multiplierValue.getDisplayType()
                    },
                    'TypeError'
                );
            }

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

            if (!coercedValue) {
                // Error message reflects the fact that negation operator is identical to * -1.
                value.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    UNSUPPORTED_OPERAND_TYPES,
                    {
                        left: value.getDisplayType(),
                        operator: '*',
                        right: 'int'
                    },
                    'TypeError'
                );
            }

            return value.factory.createArithmeticResult(coercedValue, coercedValue, -coercedValue.getNative());
        },

        /**
         * Attaches a callback for when the value has been evaluated. As present values
         * are already, this simply calls the resolve handler synchronously and ignores
         * the catch handler as there will never be an error involved here.
         *
         * @param {Function=} resolveHandler
         * @returns {ChainableInterface>}
         */
        next: function (resolveHandler) {
            var value = this,
                result;

            if (!resolveHandler) {
                return value;
            }

            try {
                result = resolveHandler(value);
            } catch (error) {
                return value.factory.createRejection(error);
            }

            result = value.flow.chainify(result);

            return result;
        },

        /**
         * Attaches a callback for when the value has been evaluated. As present values
         * are already, this simply calls the resolve handler synchronously and ignores
         * the catch handler as there will never be an error involved here.
         *
         * Note that:
         *   - This does not return a Value for chaining.
         *   - .next()/.catch()/.finally() should usually be used for chaining,
         *     this is a low-level function.
         *
         * @param {Function=} resolveHandler
         */
        nextIsolated: function (resolveHandler) {
            if (resolveHandler) {
                resolveHandler(this);
            }
        },

        /**
         * Calculates the ones' complement of this value.
         */
        onesComplement: function () {
            var value = this;

            value.callStack.raiseTranslatedError(
                PHPError.E_ERROR,
                CANNOT_PERFORM_BITWISE_NOT,
                {
                    type: value.getDisplayType()
                },
                'TypeError'
            );
        },

        /**
         * Bitwise-shifts this value left by the given number of bits.
         *
         * @param {Value} rightValue
         * @returns {IntegerValue}
         */
        shiftLeft: function (rightValue) {
            /*jshint bitwise: false */
            var leftValue = this,
                factory = leftValue.factory,
                coercedLeftValue = leftValue.coerceToNumber(),
                coercedRightValue = rightValue.coerceToNumber();

            if (!coercedLeftValue || !coercedRightValue) {
                leftValue.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    UNSUPPORTED_OPERAND_TYPES,
                    {
                        left: leftValue.getDisplayType(),
                        operator: '<<',
                        right: rightValue.getDisplayType()
                    },
                    'TypeError'
                );
            }

            return factory.createInteger(coercedLeftValue.getNative() << coercedRightValue.getNative());
        },

        /**
         * Bitwise-shifts this value right by the given number of bits.
         *
         * @param {Value} rightValue
         * @returns {IntegerValue}
         */
        shiftRight: function (rightValue) {
            /*jshint bitwise: false */
            var leftValue = this,
                factory = leftValue.factory,
                coercedLeftValue = leftValue.coerceToNumber(),
                coercedRightValue = rightValue.coerceToNumber();

            if (!coercedLeftValue || !coercedRightValue) {
                leftValue.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    UNSUPPORTED_OPERAND_TYPES,
                    {
                        left: leftValue.getDisplayType(),
                        operator: '>>',
                        right: rightValue.getDisplayType()
                    },
                    'TypeError'
                );
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

            if (!coercedLeftValue || !coercedRightValue) {
                leftValue.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    UNSUPPORTED_OPERAND_TYPES,
                    {
                        left: leftValue.getDisplayType(),
                        operator: '-',
                        right: rightValue.getDisplayType()
                    },
                    'TypeError'
                );
            }

            return leftValue.factory.createArithmeticResult(
                coercedLeftValue,
                coercedRightValue,
                coercedLeftValue.getNative() - coercedRightValue.getNative()
            );
        },

        /**
         * {@inheritdoc}
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
