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
    require('../Closure'),
    require('../KeyValuePair'),
    require('../Reference/Null'),
    require('../Reference/ObjectElement'),
    require('../Reference/Property'),
    require('../Value')
], function (
    _,
    phpCommon,
    util,
    Closure,
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
        this.internalProperties = {};
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

        /**
         * When this object is a Closure instance, returns a new Closure
         * with the specified bound `$this` object and a new current class scope
         *
         * @param {ObjectValue|NullValue} thisValue
         * @param {Class|undefined} scopeClass
         * @returns {Closure}
         */
        bindClosure: function (thisValue, scopeClass) {
            var value = this;

            if (!(value.value instanceof Closure)) {
                throw new Error('bindClosure() :: Value is not a Closure');
            }

            return value.value.bind(thisValue, scopeClass);
        },

        call: function (args) {
            return this.callMethod('__invoke', args);
        },

        /**
         * Calls the specified method of this object
         *
         * @param {string} name
         * @param {Value[]} args
         * @returns {Value}
         */
        callMethod: function (name, args) {
            var value = this;

            return value.classObject.callMethod(name, args, value);
        },

        /**
         * Calls a static method of the class this object is an instance of
         *
         * @param {StringValue} nameValue
         * @param {Value[]} args
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @param {bool} isForwarding eg. self::f() is forwarding, MyParentClass::f() is non-forwarding
         * @returns {Value}
         */
        callStaticMethod: function (nameValue, args, namespaceOrNamespaceScope, isForwarding) {
            // Could be a static call in object context, in which case we want to pass
            // the object value through.
            // This will be handled by a fetch of `callStack.getThisObject()` inside `.callMethod(...)`
            return this.classObject.callMethod(nameValue.getNative(), args, null, null, null, isForwarding);
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

        /**
         * Divides (the numeric coercion of) this object by another value
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        divide: function (rightValue) {
            return rightValue.divideByObject(this);
        },

        /**
         * Divides a non-array value by this object
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        divideByNonArray: function (leftValue) {
            // Trigger notice due to coercion
            this.coerceToInteger();

            // Objects are always cast to int(1), so divisor will always be 1
            return leftValue.coerceToNumber();
        },

        formatAsString: function () {
            return 'Object(' + this.getClassName() + ')';
        },

        getCallableName: function () {
            var value = this;

            if (value.classObject.is('Closure')) {
                return value.value.funcName;
            }

            return value.getClassName() + '::__invoke()';
        },

        /**
         * Fetches the Class of this object
         *
         * @returns {Class}
         */
        getClass: function () {
            return this.classObject;
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

        getForThrow: function () {
            return this.value;
        },

        getID: function () {
            return this.id;
        },

        getProperty: function (name) {
            var value = this,
                nameValue = value.factory.createString(name);

            return value.getInstancePropertyByName(nameValue).getValue();
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
                    value.value,
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

        /**
         * Sets the value of an internal property for this object. Internal properties
         * have nothing to do with the native object they wrap, so this mechanism
         * is useful for native classes to store data without PHP code having access to it
         *
         * @param {string} name
         * @returns {*}
         */
        getInternalProperty: function (name) {
            var value = this;

            if (!hasOwn.call(value.internalProperties, name)) {
                throw new Error(
                    'Object of class "' + value.getClassName() + '" has no internal property "' + name + '"'
                );
            }

            return value.internalProperties[name];
        },

        getKeyByIndex: function (index) {
            var value = this,
                keys = value.getInstancePropertyNames();

            return keys[index] || null;
        },

        getLength: function () {
            return this.getInstancePropertyNames().length;
        },

        /**
         * Unwraps this PHP object value to something that non-PHPCore JS code will understand.
         * Special PHP classes like Closure and stdClass are unwrapped specially
         *
         * @returns {Function|PHPObject|object|*}
         */
        getNative: function () {
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

                    return value.value.invoke(args, thisObj);
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
                    result[propertyName] = propertyValue.getNative();
                });

                return result;
            }

            return value.classObject.unwrapInstanceForJS(value, value.value);
        },

        getObject: function () {
            return this.value;
        },

        getPointer: function () {
            return this.pointer;
        },

        getStaticPropertyByName: function (nameValue) {
            return this.classObject.getStaticPropertyByName(nameValue.getNative());
        },

        /**
         * Creates a new instance of the class of this object for a normal PHP object.
         * For a JSObject, if the wrapped object is a function then it will create
         * a new instance of the wrapped JS class instead,
         * returning the resulting new JSObject instance
         *
         * @param {Value[]} args
         * @returns {ObjectValue}
         */
        instantiate: function (args) {
            var value = this,
                nativeObject,
                objectValue;

            if (value.getClassName() !== 'JSObject') {
                // A normal PHP object is being instantiated as a class -
                // we just need to create a new instance of this object's class
                return value.classObject.instantiate(args);
            }

            // A JS function is being instantiated as a class from PHP (bridge integration)

            if (!_.isFunction(value.value)) {
                throw new Error('Cannot create a new instance of a non-function JSObject');
            }

            // Create an instance of the class, not calling constructor
            nativeObject = Object.create(value.value.prototype);
            objectValue = value.factory.createFromNative(nativeObject);

            // Call the constructor on the newly created instance, unwrapping arguments
            value.value.apply(nativeObject, _.map(args, function (argValue) {
                return argValue.getNative();
            }));

            return objectValue;
        },

        /**
         * Invokes the native function this object wraps when it is an instance of Closure
         *
         * @param {Value[]} args
         * @returns {Value}
         */
        invokeClosure: function (args) {
            return this.value.invoke(args);
        },

        isAnInstanceOf: function (classNameValue, namespaceOrNamespaceScope) {
            return classNameValue.isTheClassOfObject(this, namespaceOrNamespaceScope);
        },

        /**
         * Objects are never classed as empty
         *
         * @returns {boolean}
         */
        isEmpty: function () {
            return false;
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

        /**
         * Objects are never numeric: always returns false
         *
         * @returns {boolean}
         */
        isNumeric: function () {
            return false;
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

        /**
         * Multiplies this object by another value
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        multiply: function (rightValue) {
            return rightValue.multiplyByObject(this);
        },

        /**
         * Multiplies this object by a non-array value
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        multiplyByNonArray: function (leftValue) {
            // Trigger notice due to coercion
            this.coerceToInteger();

            // Objects are always cast to int(1), so multiplier will always be 1
            return leftValue.coerceToNumber();
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

        /**
         * Sets the value of an internal property for this object. Internal properties
         * have nothing to do with the native object they wrap, so this mechanism
         * is useful for native classes to store data without PHP code having access to it
         *
         * @param {string} name
         * @param {*} newValue
         */
        setInternalProperty: function (name, newValue) {
            this.internalProperties[name] = newValue;
        },

        setPointer: function (pointer) {
            this.pointer = pointer;
        },

        setProperty: function (name, newValue) {
            var value = this,
                nameValue = value.factory.createString(name);

            value.getInstancePropertyByName(nameValue).setValue(newValue);
        }
    });

    return ObjectValue;
}, {strict: true});
