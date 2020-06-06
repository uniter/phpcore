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
    Value,
    Variable
) {
    var FUNCTION_NAME_MUST_BE_STRING = 'core.function_name_must_be_string',
        UNSUPPORTED_OPERAND_TYPES = 'core.unsupported_operand_types',
        hasOwn = {}.hasOwnProperty,
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

    function ArrayValue(factory, callStack, orderedElements, type, elementProvider) {
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

                if (orderedElement instanceof Reference) {
                    elementReference = orderedElement;
                } else if (orderedElement instanceof Variable) {
                    // TODO: Prevent Variables ever being passed to the ArrayValue ctor, only References
                    elementValue = orderedElement.getValue();
                } else {
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

        Value.call(this, factory, callStack, type || 'array', elements);

        this.elementProvider = elementProvider;
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
                resultArray = leftValue.getForAssignment();

            _.forOwn(rightValue.keysToElements, function (element, key) {
                if (!hasOwn.call(resultArray.keysToElements, key)) {
                    resultArray.getElementByKey(element.getKey()).setValue(element.getValue());
                }
            });

            return resultArray;
        },

        /**
         * Adds this value to a boolean
         */
        addToBoolean: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Adds this value to a float
         */
        addToFloat: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Adds this value to an integer
         */
        addToInteger: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Adds this value to null
         */
        addToNull: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Adds this value to an object
         */
        addToObject: function (objectValue) {
            return objectValue.addToArray(this);
        },

        /**
         * Adds this value to a string
         */
        addToString: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Calls a static or instance method, referenced by the first two elements of this array
         *
         * @param {Value[]} args
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @returns {Value}
         * @throws {PHPFatalError} Throws when the given function name is not a string
         */
        call: function (args, namespaceOrNamespaceScope) {
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
                return objectOrClassValue.callStaticMethod(
                    methodNameValue,
                    args,
                    namespaceOrNamespaceScope
                );
            }

            return objectOrClassValue.callMethod(
                methodNameValue.getNative(),
                args,
                namespaceOrNamespaceScope
            );
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

        coerceToObject: function () {
            var value = this,
                object = value.factory.createStdClassObject();

            _.each(value.value, function (element) {
                object.getInstancePropertyByName(element.getKey()).setValue(element.getValue());
            });

            return object;
        },

        coerceToString: function () {
            return this.factory.createString('Array');
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

            return new ArrayValue(
                arrayValue.factory,
                arrayValue.callStack,
                orderedElements,
                arrayValue.type,
                arrayValue.elementProvider
            );
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
         * an associative array to a plain JS object
         *
         * @returns {Array|object}
         */
        getNative: function () {
            var hasNonNumericKey = false,
                result = [],
                value = this;

            _.each(value.value, function (element) {
                // Treat string keys that have a numeric value as numeric
                if (!isFinite(element.getKey().getNative())) {
                    hasNonNumericKey = true;
                }
            });

            result = hasNonNumericKey ? {} : [];

            _.each(value.value, function (element) {
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

                    return new NullReference(value.factory);
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
         * @returns {ArrayIterator}
         */
        getIterator: function () {
            var value = this;

            return value.factory.createArrayIterator(value);
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

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfArray(this);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function (namespaceScope) {
            var classObject,
                globalNamespace,
                methodNameValue,
                objectOrClassValue,
                arrayValue = this,
                value = arrayValue.value;

            if (value.length < 2) {
                return false;
            }

            globalNamespace = namespaceScope.getGlobalNamespace();
            objectOrClassValue = value[0].getValue();
            methodNameValue = value[1].getValue();

            if (objectOrClassValue.getType() === 'string') {
                if (!globalNamespace.hasClass(objectOrClassValue.getNative())) {
                    return false;
                }

                classObject = globalNamespace.getClass(objectOrClassValue.getNative());
            } else if (objectOrClassValue.getType() === 'object') {
                classObject = objectOrClassValue.getClass();
            } else {
                // First element must either be an object or a string
                return false;
            }

            if (methodNameValue.getType() !== 'string') {
                // Second, method name element must be a string containing the name of a method
                return false;
            }

            return classObject.getMethodSpec(methodNameValue.getNative()) !== null;
        },

        /**
         * Determines whether this array is classed as "empty" or not.
         * Only empty arrays (with no elements) are classed as empty
         *
         * @returns {boolean}
         */
        isEmpty: function () {
            return this.value.length === 0;
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

        next: function () {
            this.pointer++;
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
                if (element.getKey().isEqualTo(elementReference.getKey()).getNative()) {
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

            value.getElementByKey(index).setValue(otherValue);

            return value;
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

        shiftLeftBy: function (rightValue) {
            return this.coerceToInteger().shiftLeftBy(rightValue);
        },

        shiftRightBy: function (rightValue) {
            return this.coerceToInteger().shiftRightBy(rightValue);
        },

        sort: function (callback) {
            this.value.sort(callback);
        }
    });

    return ArrayValue;
}, {strict: true});
