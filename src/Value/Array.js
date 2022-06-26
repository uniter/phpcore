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
    require('../KeyReferencePair'),
    require('../KeyValuePair'),
    require('../Reference/Null'),
    require('../Reference/Reference'),
    require('../Element/ReferenceElement'),
    require('../Reference/ReferenceSlot'),
    require('../Value'),
    require('../Variable')
], function (
    _,
    phpCommon,
    util,
    ElementReference,
    KeyReferencePair,
    KeyValuePair,
    NullReference,
    Reference,
    ReferenceElement,
    ReferenceSlot,
    Value,
    Variable
) {
    var FUNCTION_NAME_MUST_BE_STRING = 'core.function_name_must_be_string',
        UNSUPPORTED_OPERAND_TYPES = 'core.unsupported_operand_types',
        hasOwn = {}.hasOwnProperty,
        Exception = phpCommon.Exception,
        PHPError = phpCommon.PHPError,
        /**
         * Prefixes any key called `length` with an underscore to avoid collisions
         * with the native array `length` property (an array is used to maintain numeric indices).
         * Any key that is already `_length` must also be prefixed again to avoid collisions there too.
         *
         * @param {*} keyNative
         * @returns {*}
         */
        sanitiseKey = function (keyNative) {
            if (typeof keyNative === 'number') {
                return keyNative;
            }

            if (typeof keyNative === 'string') {
                return keyNative.replace(/^_*length/, '_$&');
            }

            return keyNative;
        };

    /**
     * Represents a PHP array value.
     *
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {Flow} flow
     * @param {Array} orderedElements
     * @param {ElementProvider|HookableElementProvider} elementProvider
     * @constructor
     */
    function ArrayValue(
        factory,
        referenceFactory,
        futureFactory,
        callStack,
        flow,
        orderedElements,
        elementProvider
    ) {
        var elements = [],
            keysToElements = [],
            value = this;

        _.each(orderedElements, function (orderedElement, key) {
            var element,
                elementReference = null,
                elementValue = null;

            if (orderedElement instanceof KeyValuePair) {
                key = orderedElement.getKey();
                elementValue = orderedElement.getValue();
            } else if (orderedElement instanceof KeyReferencePair) {
                key = orderedElement.getKey();
                elementReference = orderedElement.getReference();
            } else {
                if (_.isNumber(key)) {
                    key = factory.createInteger(keysToElements.length);
                } else {
                    key = factory.createFromNative(key);
                }

                if (orderedElement instanceof ReferenceElement) {
                    // A reference was explicitly provided: the resulting array element
                    // should be a reference.
                    elementReference = orderedElement.getReference();
                } else if (orderedElement instanceof Reference || orderedElement instanceof Variable) {
                    throw new Exception('Unwrapped elements should be ReferenceElements or Values');
                } else {
                    // Otherwise, value is either native or already a Value object: coerce to Value.
                    elementValue = factory.coerce(orderedElement);
                }
            }

            if (elementValue) {
                element = elementProvider.createElement(factory, callStack, value, key, elementValue);
            } else {
                element = elementProvider.createElement(factory, callStack, value, key, null, elementReference);
            }

            elements.push(element);
            keysToElements[sanitiseKey(key.getNative())] = element;
        });

        Value.call(this, factory, referenceFactory, futureFactory, callStack, 'array', elements);

        /**
         * @type {ElementProvider|HookableElementProvider}
         */
        this.elementProvider = elementProvider;
        /**
         * @type {Flow}
         */
        this.flow = flow;
        /**
         * @type {Object.<string, ElementReference>}
         */
        this.keysToElements = keysToElements;
        /**
         * @type {number}
         */
        this.pointer = 0;
    }

    util.inherits(ArrayValue, Value);

    _.extend(ArrayValue.prototype, {
        /**
         * Overrides the implementation in Value, allowing for unioning arrays together
         * with the plus operator
         *
         * @param {Reference|Value|Variable} rightValue
         * @returns {Value}
         */
        add: function (rightValue) {
            var leftValue = this,
                resultArray;

            if (rightValue.getType() !== 'array') {
                rightValue.coerceToNumber();

                leftValue.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
            }

            resultArray = leftValue.getForAssignment();

            return leftValue.flow
                .forOwnAsync(rightValue.keysToElements, function (element, key) {
                    if (!hasOwn.call(resultArray.keysToElements, key)) {
                        return resultArray.getElementByKey(element.getKey()).setValue(element.getValue());
                    }
                })
                .next(function () {
                    return resultArray;
                })
                .asValue();
        },

        /**
         * Exports a wrapped PHP indexed array to a native array, or
         * an associative array to a plain JS object, wrapped as a Future.
         *
         * @returns {Future<Array|object>}
         */
        asEventualNative: function () {
            var hasNonNumericKey = false,
                result,
                value = this;

            _.each(value.value, function (element) {
                // Treat string keys that have a numeric value as numeric
                if (!isFinite(element.getKey().getNative())) {
                    hasNonNumericKey = true;
                }
            });

            result = hasNonNumericKey ? {} : [];

            return value.flow
                .eachAsync(value.value, function (element) {
                    return element.getValue().next(function (presentValue) {
                        result[element.getKey().getNative()] = presentValue.getNative();
                    });
                })
                .next(function () {
                    return result;
                });
        },

        /**
         * Calls a static or instance method, referenced by the first two elements of this array
         *
         * @param {Reference[]|Value[]|Variable[]} args
         * @returns {Value}
         * @throws {PHPFatalError} Throws when the given function name is not a string
         */
        call: function (args) {
            var methodNameValue,
                objectOrClassValue,
                arrayValue = this,
                value = arrayValue.value;

            if (value.length < 2) {
                arrayValue.callStack.raiseTranslatedError(PHPError.E_ERROR, FUNCTION_NAME_MUST_BE_STRING);
            }

            objectOrClassValue = value[0].getValue();
            methodNameValue = value[1].getValue();

            if (objectOrClassValue.getType() === 'string') {
                return objectOrClassValue.callStaticMethod(methodNameValue, args);
            }

            return objectOrClassValue.callMethod(methodNameValue.getNative(), args);
        },

        /**
         * Overrides the implementation in Value - when an array is coerced to an array,
         * we keep it unchanged and do not wrap it in a further array
         *
         * @returns {ArrayValue}
         */
        coerceToArray: function () {
            return this;
        },

        /**
         * {@inheritdoc}
         */
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
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * {@inheritdoc}
         */
        coerceToObject: function () {
            var value = this;

            return value.factory.createStdClassObject().next(function (objectValue) {
                return value.flow.eachAsync(value.value, function (element) {
                    return objectValue.getInstancePropertyByName(element.getKey()).setValue(element.getValue());
                }).next(function () {
                    return objectValue;
                });
            });
        },

        coerceToString: function () {
            return this.factory.createString('Array');
        },

        /**
         * {@inheritdoc}
         */
        compareWithArray: function (leftValue) {
            var comparisonResult = 0, // Consider arrays equal until proven unequal by the loop below.
                rightValue = this;

            if (leftValue.value.length < rightValue.value.length) {
                // Left array contains fewer elements than the right: consider left array smaller.
                return -1;
            }

            if (leftValue.value.length > rightValue.value.length) {
                // Left array contains more elements than the right: consider left array greater.
                return 1;
            }

            _.forOwn(leftValue.keysToElements, function (element, nativeKey) {
                var elementComparisonResult;

                if (!hasOwn.call(rightValue.keysToElements, nativeKey)) {
                    // Left array contains an element that the right does not: consider left array greater.
                    comparisonResult = 1;
                    return false;
                }

                elementComparisonResult = element.getValue().compareWithPresent(
                    rightValue.keysToElements[nativeKey].getValue()
                );

                if (elementComparisonResult !== 0) {
                    // Element has a different value in left array than the right:
                    // use comparison result (will be either -1 or 1).
                    comparisonResult = elementComparisonResult;
                    return false;
                }
            });

            return comparisonResult;
        },

        /**
         * {@inheritdoc}
         */
        compareWithBoolean: function (leftValue) {
            var rightValue = this,
                booleanValue = leftValue.getNative(),
                arrayIsNotEmpty = rightValue.value.length > 0;

            if (!booleanValue && arrayIsNotEmpty) {
                return -1;
            }

            if (booleanValue && !arrayIsNotEmpty) {
                return 1;
            }

            return 0;
        },

        /**
         * {@inheritdoc}
         */
        compareWithFloat: function () {
            return -1; // Arrays (even empty ones) are always greater (except for objects, see .compareWithObject()).
        },

        /**
         * {@inheritdoc}
         */
        compareWithInteger: function () {
            return -1; // Arrays (even empty ones) are always greater (except for objects, see .compareWithObject()).
        },

        /**
         * {@inheritdoc}
         */
        compareWithNull: function () {
            var rightValue = this,
                arrayLength = rightValue.getLength();

            return arrayLength > 0 ? -1 : 0;
        },

        /**
         * {@inheritdoc}
         */
        compareWithObject: function () {
            return 1; // Objects are always greater than arrays.
        },

        /**
         * {@inheritdoc}
         */
        compareWithPresent: function (rightValue) {
            return rightValue.compareWithArray(this);
        },

        /**
         * {@inheritdoc}
         */
        compareWithResource: function () {
            return -1; // Arrays (even empty ones) are always greater (except for objects, see .compareWithObject()).
        },

        /**
         * {@inheritdoc}
         */
        compareWithString: function () {
            return -1; // Arrays (even empty ones) are always greater (except for objects, see .compareWithObject()).
        },

        /**
         * {@inheritdoc}
         */
        decrement: function () {
            // NB: This is the expected behaviour, vs. attempting to subtract one from an array explicitly.
            return this.getForAssignment();
        },

        defineElement: function (elementReference) {
            var value = this;

            if (value.value.indexOf(elementReference) === -1) {
                value.value.push(elementReference);
            }
        },

        formatAsString: function () {
            return 'Array';
        },

        /**
         * Fetches a copy of this array, as in PHP arrays are always passed by value
         * and not by reference
         *
         * @return {ArrayValue}
         */
        getForAssignment: function () {
            var arrayValue = this,
                orderedElements = [];

            _.each(arrayValue.value, function (element) {
                if (element.isDefined()) {
                    orderedElements.push(element.getPairForAssignment());
                }
            });

            return arrayValue.factory.createArray(orderedElements, arrayValue.elementProvider);
        },

        getKeys: function () {
            var keys = [];

            _.each(this.value, function (element) {
                keys.push(element.getKey());
            });

            return keys;
        },

        /**
         * Exports a wrapped PHP indexed array to a native array, or
         * an associative array to a plain JS object.
         *
         * @returns {Array|object}
         */
        getNative: function () {
            // Note that if this value contains any references that return Future(Values),
            // an error will be raised.
            return this.asEventualNative().yieldSync();
        },

        /**
         * Fetches a reference to the element this array's internal pointer is currently pointing to.
         *
         * @returns {Reference}
         */
        getCurrentElementReference: function () {
            var value = this;

            return value.value[value.pointer] || value.referenceFactory.createNull();
        },

        /**
         * Fetches the value of the element this array's internal pointer is currently pointing to.
         *
         * @returns {Value}
         */
        getCurrentElementValue: function () {
            return this.getCurrentElementReference().getValue();
        },

        /**
         * {@inheritdoc}
         */
        getElementByKey: function (key) {
            var element,
                keyValue,
                value = this;

            key = key.coerceToKey(value.callStack);

            if (!key) {
                // Could not be coerced to a key: error will already have been handled, just return NULL
                return value.referenceFactory.createNull();
            }

            keyValue = sanitiseKey(key.getNative());

            if (!hasOwn.call(value.keysToElements, keyValue)) {
                element = value.elementProvider.createElement(value.factory, value.callStack, value, key, null);

                value.keysToElements[keyValue] = element;
            }

            return value.keysToElements[keyValue];
        },

        getElementByIndex: function (index) {
            var value = this;

            return value.value[index] || (function () {
                    value.callStack.raiseError(PHPError.E_NOTICE, 'Undefined ' + value.referToElement(index));

                    return value.referenceFactory.createNull();
                }());
        },

        /**
         * Fetches a KeyValuePair or KeyReferencePair for the specified array element,
         * optionally allowing the key to be overridden
         *
         * @param {Value} key
         * @param {Value|undefined} overrideKey
         * @returns {KeyValuePair|KeyReferencePair}
         */
        getElementPairByKey: function (key, overrideKey) {
            return this.getElementByKey(key).getPairForAssignment(overrideKey);
        },

        /**
         * Creates an ArrayIterator for iterating over this array. Used by transpiled foreach loops.
         *
         * @returns {Future<ArrayIterator>}
         */
        getIterator: function () {
            var value = this;

            return value.futureFactory.createPresent(value.factory.createArrayIterator(value));
        },

        getValueReferences: function () {
            var references = [];

            _.each(this.value, function (element) {
                references.push(element.getValueReference());
            });

            return references;
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

        /**
         * {@inheritdoc}
         */
        getPushElement: function () {
            var value = this;

            return value.elementProvider.createElement(value.factory, value.callStack, value, null, null);
        },

        getValues: function () {
            var values = [];

            _.each(this.value, function (element) {
                values.push(element.getValue());
            });

            return values;
        },

        /**
         * {@inheritdoc}
         */
        increment: function () {
            // NB: This is the expected behaviour, vs. attempting to add one to an array explicitly.
            return this.getForAssignment();
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfArray(this);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function (globalNamespace) {
            var classObjectFuture,
                methodNameValue,
                objectOrClassValue,
                arrayValue = this,
                futureFactory = arrayValue.futureFactory,
                value = arrayValue.value;

            if (value.length < 2) {
                // We need two elements: the class FQCN or an instance plus the method name
                return futureFactory.createPresent(false);
            }

            objectOrClassValue = value[0].getValue();
            methodNameValue = value[1].getValue();

            if (objectOrClassValue.getType() === 'string') {
                classObjectFuture = globalNamespace.getClass(objectOrClassValue.getNative());
            } else if (objectOrClassValue.getType() === 'object') {
                classObjectFuture = futureFactory.createPresent(objectOrClassValue.getClass());
            } else {
                // First element must either be an object or a string
                return futureFactory.createPresent(false);
            }

            if (methodNameValue.getType() !== 'string') {
                // Second, method name element must be a string containing the name of a method
                return futureFactory.createPresent(false);
            }

            return classObjectFuture.next(function (classObject) {
                return classObject.getMethodSpec(methodNameValue.getNative()) !== null;
            }, function () {
                // TODO: Ensure that the error swallowed here cannot be something important

                return false;
            });
        },

        /**
         * Determines whether this array is classed as "empty" or not.
         * Only empty arrays (with no elements) are classed as empty
         *
         * @returns {Future<boolean>}
         */
        isEmpty: function () {
            var value = this;

            return value.futureFactory.createPresent(value.value.length === 0);
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

        /**
         * {@inheritdoc}
         */
        isIterable: function () {
            return true;
        },

        /**
         * Arrays are never numeric: always returns false
         *
         * @returns {boolean}
         */
        isNumeric: function () {
            return false;
        },

        /**
         * Calculates the ones' complement of this value
         */
        onesComplement: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
        },

        pointToElement: function (elementReference) {
            var value = this;

            _.each(value.value, function (element, index) {
                if (element.getKey().compareWithPresent(elementReference.getKey()) === 0) {
                    value.setPointer(index);
                }
            });
        },

        /**
         * Removes the last element from the array and then returns it, if any.
         * If the array is empty (so that there is no last element), NULL is returned
         *
         * @returns {Value}
         */
        pop: function () {
            var value = this,
                length = value.getLength();

            if (length === 0) {
                // Array is empty: nothing to pop off
                return value.factory.createNull();
            }

            delete value.keysToElements[value.getKeyByIndex(length - 1).getNative()];

            value.pointer = 0;

            return value.value.pop().getValue();
        },

        /**
         * Pushes an indexed element onto the array and then returns the array
         *
         * @param {Value} otherValue
         * @returns {ArrayValue}
         */
        push: function (otherValue) {
            var value = this,
                index = value.factory.createInteger(value.keysToElements.length);

            return value.getElementByKey(index).setValue(otherValue).next(function () {
                return value;
            });
        },

        /**
         * Pushes an indexed element onto the array and then returns the key generated for it
         *
         * @param {ElementReference} elementReference
         * @returns {IntegerValue}
         */
        pushElement: function (elementReference) {
            var value = this,
                key = value.keysToElements.length,
                keyValue;

            value.keysToElements[key] = elementReference;
            value.value.push(elementReference);

            keyValue = value.factory.createInteger(key);
            elementReference.setKey(keyValue);

            return keyValue;
        },

        /**
         * Generates a human-readable string that refers to an element
         *
         * @param {string} key
         * @returns {string}
         */
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

        /**
         * Removes the first element from the array, returning it
         * and renumbering any numeric keys
         *
         * @returns {Value}
         */
        shift: function () {
            var value = this,
                elements = value.value,
                newElements = [],
                newKeysToElements = {},
                nextNumericKey = 0;

            if (elements.length === 0) {
                return value.factory.createNull();
            }

            _.each(elements.slice(1), function (element) {
                var key = element.getKey(),
                    nativeKey = key.getNative();

                if (isFinite(nativeKey)) {
                    // All numeric keys need to be renumbered to start from zero
                    nativeKey = nextNumericKey++;
                    key = value.factory.createInteger(nativeKey);
                }

                element = value.elementProvider.createElement(value.factory, value.callStack, value, key, element.getValue());

                newKeysToElements[sanitiseKey(nativeKey)] = element;
                newElements.push(element);
            });

            // Internal array pointer needs to be reset to the start of the array.
            // As we are removing an element and renumbering any numerically indexed ones,
            // the pointer could be left invalid if we didn't anyway
            value.pointer = 0;
            value.keysToElements = newKeysToElements;
            value.value = newElements;

            return elements[0].getValue();
        },

        sort: function (callback) {
            this.value.sort(callback);
        }
    });

    return ArrayValue;
}, {strict: true});
