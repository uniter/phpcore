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
    require('../KeyValuePair'),
    require('../Reference/Null'),
    require('../Reference/ObjectElement'),
    require('../Reference/Property'),
    require('../Value')
], function (
    _,
    phpCommon,
    util,
    KeyValuePair,
    NullReference,
    ObjectElement,
    PropertyReference,
    Value
) {
    var hasOwn = {}.hasOwnProperty,
        getPropertyCaseInsensitive = function (object, property) {
            var found = false,
                lowerCaseProperty = property.toLowerCase(),
                otherObject,
                value = null;

            _.forOwn(object, function (propertyValue, propertyName) {
                if (propertyName.toLowerCase() === lowerCaseProperty) {
                    found = true;
                    value = propertyValue;
                    return false;
                }
            });

            if (!found) {
                otherObject = Object.getPrototypeOf(object);

                if (!otherObject) {
                    return null;
                }

                return getPropertyCaseInsensitive(otherObject, property);
            }

            return {
                object: object,
                value: value
            };
        },
        PHPError = phpCommon.PHPError,
        PHPFatalError = phpCommon.PHPFatalError;

    function ObjectValue(factory, callStack, object, classObject, id) {
        Value.call(this, factory, callStack, 'object', object);

        this.classObject = classObject;
        this.id = id;
        this.pointer = 0;
        this.properties = {};
    }

    util.inherits(ObjectValue, Value);

    _.extend(ObjectValue.prototype, {
        add: function (rightValue) {
            return rightValue.addToObject(this);
        },

        addToArray: function () {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Object of class ' + value.classObject.getName() + ' could not be converted to int'
            );

            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        addToBoolean: function (booleanValue) {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Object of class ' + value.classObject.getName() + ' could not be converted to int'
            );

            return value.factory.createInteger((booleanValue.value ? 1 : 0) + 1);
        },

        addToFloat: function (floatValue) {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Object of class ' + value.classObject.getName() + ' could not be converted to int'
            );

            return value.factory.createFloat(floatValue.value + 1);
        },

        call: function (args) {
            return this.callMethod('__invoke', args);
        },

        callMethod: function (name, args) {
            var defined = true,
                func,
                match,
                value = this,
                object = value.value,
                thisObject = value,
                thisVariable;

            // Call functions directly when invoking the magic method
            if (name === '__invoke' && _.isFunction(object)) {
                func = object;
            } else {
                if (value.classObject.getName() === 'JSObject') {
                    func = object[name];
                } else {
                    // Allow methods inherited via the prototype chain up to but not including Object.prototype
                    match = getPropertyCaseInsensitive(object, name);

                    if (!match || match.object === Object.prototype) {
                        defined = false;
                    } else {
                        func = match.value;
                    }
                }
            }

            if (!defined || !_.isFunction(func)) {
                throw new PHPFatalError(
                    PHPFatalError.UNDEFINED_METHOD,
                    {
                        className: value.classObject.getName(),
                        methodName: name
                    }
                );
            }

            // Unwrap thisObj and argument Value objects when calling out
            // to a native JS object method
            if (value.classObject.getName() === 'JSObject') {
                thisObject = _.isFunction(object) ? null : object;
                _.each(args, function (arg, index) {
                    args[index] = arg.unwrapForJS();
                });
                // Use the current object as $this for PHP closures by default
            } else if (value.classObject.getName() === 'Closure') {
                // Store the current PHP thisObj to set for the closure
                thisVariable = object.scopeWhenCreated.getVariable('this');
                thisObject = thisVariable.isDefined() ?
                    thisVariable.getValue() :
                    null;
            }

            return value.factory.coerce(func.apply(thisObject, args));
        },

        callStaticMethod: function (nameValue, args) {
            return this.classObject.callStaticMethod(nameValue.getNative(), args);
        },

        classIs: function (className) {
            return this.classObject.is(className);
        },

        clone: function () {
            throw new Error('Unimplemented');
        },

        coerceToArray: function () {
            var elements = [],
                value = this,
                factory = value.factory;

            _.forOwn(value.value, function (propertyValue, propertyName) {
                elements.push(
                    new KeyValuePair(
                        factory.coerce(propertyName),
                        factory.coerce(propertyValue)
                    )
                );
            });

            return value.factory.createArray(elements);
        },

        coerceToBoolean: function () {
            return this.factory.createBoolean(true);
        },

        coerceToInteger: function () {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Object of class ' + value.classObject.getName() + ' could not be converted to int'
            );

            return value.factory.createInteger(1);
        },

        coerceToNumber: function () {
            return this.coerceToInteger();
        },

        coerceToKey: function () {
            this.callStack.raiseError(PHPError.E_WARNING, 'Illegal offset type');
        },

        coerceToObject: function () {
            // Already an object: no coercion needed
            return this;
        },

        coerceToString: function () {
            return this.callMethod('__toString');
        },

        divide: function (rightValue) {
            return rightValue.divideByObject(this);
        },

        divideByBoolean: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByFloat: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByInteger: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByNonArray: function (leftValue) {
            // Trigger notice due to coercion
            this.coerceToInteger();

            // Objects are always cast to int(1), so divisor will always be 1
            return leftValue.coerceToNumber();
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

        getClassName: function () {
            return this.classObject.getName();
        },

        getConstantByName: function (name) {
            return this.classObject.getConstantByName(name);
        },

        getElementByIndex: function (index) {
            var value = this,
                names = value.getInstancePropertyNames();

            if (!hasOwn.call(names, index)) {
                value.callStack.raiseError(
                    PHPError.E_NOTICE,
                    'Undefined ' + value.referToElement(index)
                );

                return new NullReference(value.factory);
            }

            return value.getInstancePropertyByName(names[index]);
        },

        getElementByKey: function (key) {
            var value = this;

            key = key.coerceToKey(value.callStack);

            if (!key) {
                // Could not be coerced to a key: error will already have been handled, just return NULL
                return new NullReference(value.factory);
            }

            if (value.classObject.is('ArrayAccess')) {
                return new ObjectElement(value.factory, value, key);
            }

            throw new PHPFatalError(PHPFatalError.CANNOT_USE_WRONG_TYPE_AS, {
                actual: value.classObject.getName(),
                expected: 'array'
            });
        },

        getForAssignment: function () {
            return this;
        },

        getID: function () {
            return this.id;
        },

        getInstancePropertyByName: function (nameValue) {
            var nameKey = nameValue.coerceToKey(),
                name = nameKey.getNative(),
                value = this;

            if (value.classObject.hasStaticPropertyByName(name)) {
                value.callStack.raiseError(
                    PHPError.E_STRICT,
                    'Accessing static property ' + value.classObject.getName() + '::$' + name + ' as non static'
                );
            }

            if (!hasOwn.call(value.properties, name)) {
                value.properties[name] = new PropertyReference(
                    value.factory,
                    value.callStack,
                    value,
                    nameKey
                );
            }

            return value.properties[name];
        },

        getInstancePropertyNames: function () {
            var nameHash = {},
                names = [],
                value = this;

            _.forOwn(value.value, function (value, name) {
                nameHash[name] = true;
            });

            _.forOwn(value.properties, function (value, name) {
                if (value.isDefined()) {
                    nameHash[name] = true;
                }
            });

            _.forOwn(nameHash, function (t, name) {
                names.push(value.factory.coerce(name));
            });

            return names;
        },

        getKeyByIndex: function (index) {
            var value = this,
                keys = value.getInstancePropertyNames();

            return keys[index] || null;
        },

        getLength: function () {
            return this.getInstancePropertyNames().length;
        },

        getNative: function () {
            return this.value;
        },

        getPointer: function () {
            return this.pointer;
        },

        getStaticPropertyByName: function (nameValue) {
            return this.classObject.getStaticPropertyByName(nameValue.getNative());
        },

        isAnInstanceOf: function (classNameValue, namespaceOrNamespaceScope) {
            return classNameValue.isTheClassOfObject(this, namespaceOrNamespaceScope);
        },

        isEqualTo: function (rightValue) {
            return rightValue.isEqualToObject(this);
        },

        isEqualToArray: function () {
            return this.factory.createBoolean(false);
        },

        isEqualToFloat: function (floatValue) {
            return this.factory.createBoolean(floatValue.getNative() === 1);
        },

        isEqualToInteger: function (integerValue) {
            return this.factory.createBoolean(integerValue.getNative() === 1);
        },

        isEqualToNull: function () {
            return this.factory.createBoolean(false);
        },

        isEqualToObject: function (rightValue) {
            var equal = true,
                leftValue = this,
                factory = leftValue.factory;

            if (
                rightValue.getLength() !== leftValue.getLength() ||
                rightValue.getClassName() !== leftValue.getClassName()
            ) {
                return factory.createBoolean(false);
            }

            _.forOwn(rightValue.value, function (element, nativeKey) {
                if (
                    !hasOwn.call(leftValue.value, nativeKey) ||
                    factory.coerce(element).isNotEqualTo(
                        leftValue.value[nativeKey].getValue()
                    ).getNative()
                ) {
                    equal = false;
                    return false;
                }
            });

            return factory.createBoolean(equal);
        },

        isEqualToString: function () {
            return this.factory.createBoolean(false);
        },

        isIdenticalTo: function (rightValue) {
            return rightValue.isIdenticalToObject(this);
        },

        isIdenticalToArray: function () {
            return this.factory.createBoolean(false);
        },

        isIdenticalToObject: function (rightValue) {
            var leftValue = this,
                factory = leftValue.factory;

            return factory.createBoolean(rightValue.value === leftValue.value);
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

        isTheClassOfObject: function (leftValue) {
            var rightValue = this;

            return rightValue.factory.createBoolean(
                rightValue.classObject === leftValue.classObject ||
                    leftValue.classObject.extends(rightValue.classObject)
            );
        },

        isTheClassOfString: function () {
            return this.factory.createBoolean(false);
        },

        pointToProperty: function (propertyReference) {
            var index = 0,
                propertyName = propertyReference.getKey().getNative(),
                value = this;

            _.forOwn(value.value, function (property, name) {
                if (name === propertyName) {
                    value.setPointer(index);
                }

                index++;
            });
        },

        referToElement: function (key) {
            return 'property: ' + this.getClassName() + '::$' + key;
        },

        reset: function () {
            var value = this;

            value.pointer = 0;

            return value;
        },

        setPointer: function (pointer) {
            this.pointer = pointer;
        },

        unwrapForJS: function () {
            var result,
                value = this;

            if (value.classObject.getName() === 'Closure') {
                // When calling a PHP closure from JS, preserve thisObj
                // by passing it in (wrapped) as the first argument
                return function () {
                    // Wrap thisObj in *Value object
                    var thisObj = value.factory.coerceObject(this),
                        args = [];

                    // Wrap all native JS values in *Value objects
                    _.each(arguments, function (arg) {
                        args.push(value.factory.coerce(arg));
                    });

                    return value.value.apply(thisObj, args);
                };
            }

            // Don't wrap JS objects in PHPObject
            if (value.classObject.getName() === 'JSObject') {
                return value.value;
            }

            // Don't wrap stdClass objects in PHPObject, unwrap them recursively
            if (value.classObject.getName() === 'stdClass') {
                result = {};

                _.forOwn(value.value, function (propertyValue, propertyName) {
                    result[propertyName] = propertyValue.unwrapForJS();
                });

                return result;
            }

            return value.classObject.unwrapInstanceForJS(value, value.value);
        }
    });

    return ObjectValue;
}, {strict: true});
