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
        Exception = phpCommon.Exception,
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
         * Moves the iterator to its next position.
         * Used by transpiled foreach loops over objects implementing Iterator.
         */
        advance: function () {
            var value = this;

            if (!value.classIs('Iterator')) {
                throw new Exception('Object.advance() :: Object does not implement Iterator');
            }

            value.callMethod('next');
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

        /**
         * Calls the magic __invoke() method for this object
         *
         * @param {Reference[]|Value[]|Variable[]} args
         * @return {Reference|Value}
         */
        call: function (args) {
            return this.callMethod('__invoke', args);
        },

        /**
         * Calls the specified method of this object
         *
         * @param {string} name
         * @param {Value[]?} args
         * @returns {Value|null} Returns the result of the method if it exists, or null if it does not exist
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

        /**
         * Determines whether this object is an instance of the given class
         *
         * @param {string} className
         * @return {boolean}
         */
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

        /**
         * Unwraps this instance of Exception to a native JS error
         *
         * @returns {Error}
         */
        coerceToNativeError: function () {
            var value = this;

            if (!value.classObject.is('Exception')) {
                throw new Error('Cannot coerce non-Exception instance to a native JS error');
            }

            return new Error(
                'PHP ' + value.getClassName() + ': ' +
                value.callMethod('getMessage', []).getNative()
            );
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

        /**
         * Builds a string representation of this value
         *
         * @return {string}
         */
        formatAsString: function () {
            return 'Object(' + this.getClassName() + ')';
        },

        /**
         * Fetches the callable name of the value this reference resolves to
         *
         * @returns {string}
         */
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

        /**
         * Fetches the name of the class of this object
         *
         * @return {string}
         */
        getClassName: function () {
            return this.classObject.getName();
        },

        /**
         * Fetches a constant for the class of this object
         *
         * @param {string} name
         * @returns {Value}
         */
        getConstantByName: function (name) {
            return this.classObject.getConstantByName(name);
        },

        /**
         * Fetches a reference to the value at the current position of the iterator.
         * Used by transpiled foreach loops over objects implementing Iterator.
         *
         * @returns {Reference}
         */
        getCurrentElementReference: function () {
            // FIXME: Should this raise a warning or something?
            //        What if the current() method is marked as return-by-reference?
            return this.getCurrentElementValue();
        },

        /**
         * Fetches the value at the current position of the iterator.
         * Used by transpiled foreach loops over objects implementing Iterator.
         *
         * @returns {Value}
         */
        getCurrentElementValue: function () {
            var value = this;

            if (!value.classIs('Iterator')) {
                throw new Exception('Object.getCurrentElementValue() :: Object does not implement Iterator');
            }

            return value.callMethod('current');
        },

        /**
         * Fetches the key for the current position of the iterator.
         * Used by transpiled foreach loops over objects implementing Iterator.
         *
         * @returns {Value}
         */
        getCurrentKey: function () {
            var value = this;

            if (!value.classIs('Iterator')) {
                throw new Exception('Object.getCurrentKey() :: Object does not implement Iterator');
            }

            return value.callMethod('key').coerceToKey();
        },

        /**
         * Fetches an element of the value this reference resolves to
         *
         * @param {number} index
         * @returns {Reference}
         */
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

        /**
         * Returns either the current value or one based on it as part of an assignment.
         * Objects are passed around by reference so this should just return this
         *
         * @returns {Value}
         */
        getForAssignment: function () {
            return this;
        },

        /**
         * Returns the native value that represents the error
         *
         * @returns {object}
         */
        getForThrow: function () {
            return this.value;
        },

        /**
         * Fetches the unique internal ID of this object. Used by eg. var_dump(...)
         *
         * @returns {number}
         */
        getID: function () {
            return this.id;
        },

        /**
         * Fetches the value of an instance property of this object
         *
         * @param {string} name
         * @returns {Value}
         */
        getProperty: function (name) {
            var value = this,
                nameValue = value.factory.createString(name);

            return value.getInstancePropertyByName(nameValue).getValue();
        },

        /**
         * Fetches an instance property of this object
         *
         * @param {Value} nameValue
         * @return {PropertyReference}
         */
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

        /**
         * Fetches the names of all instance properties of this object, wrapped as values
         *
         * @return {Value[]}
         */
        getInstancePropertyNames: function () {
            var nameHash = {},
                names = [],
                value = this;

            // Include the names of all properties of the wrapped native object
            // TODO: Move this custom logic to JSObject, called via a magic method?
            _.forOwn(value.value, function (value, name) {
                nameHash[name] = true;
            });

            // Include the names of all properties defined on the class
            _.forOwn(value.properties, function (value, name) {
                if (value.isDefined()) {
                    nameHash[name] = true;
                }
            });

            // Wrap all the names in Value objects before returning
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

        /**
         * Fetches either an ArrayIterator (for a normal object)
         * or the object itself if it implements Traversable via Iterator or IteratorAggregate.
         * Used by transpiled foreach loops over objects implementing Iterator.
         *
         * @return {ArrayIterator|ObjectValue}
         */
        getIterator: function () {
            var value = this,
                iteratorValue = value;

            value.pointer = 0;

            if (iteratorValue.classIs('IteratorAggregate')) {
                // IteratorAggregate requires its ->getIterator() method to return something iterable
                iteratorValue = iteratorValue.callMethod('getIterator');

                if (iteratorValue.getType() !== 'object' || !iteratorValue.classIs('Iterator')) {
                    throw value.factory.instantiateObject('Exception', [
                        'Objects returned by ' + value.getClassName() + '::getIterator() must be traversable or implement interface Iterator'
                    ]);
                }
            }

            if (!iteratorValue.classIs('Iterator')) {
                // Objects not implementing Traversable are iterated like arrays
                return value.factory.createArrayIterator(value);
            }

            iteratorValue.callMethod('rewind');

            return iteratorValue;
        },

        /**
         * Fetches a key (property name) of this object by its index
         *
         * @param {number} index
         * @return {Value|null}
         */
        getKeyByIndex: function (index) {
            var value = this,
                keys = value.getInstancePropertyNames();

            return keys[index] || null;
        },

        /**
         * Fetches the length (number of properties) for this object
         *
         * @return {number}
         */
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

            // Don't wrap JS objects in PHPObject
            // TODO: Move this out to JSObject.js by setting a custom unwrapper
            if (value.classObject.getName() === 'JSObject') {
                return value.value;
            }

            // Don't wrap stdClass objects in PHPObject, unwrap them recursively
            // TODO: Move this out to stdClass.js by setting a custom unwrapper
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

        /**
         * Exports a proxy object that allows JS code to call any method of this object
         * (including magic ones implemented with __call)
         *
         * @returns {PHPObject}
         */
        getProxy: function () {
            var value = this;

            return value.classObject.proxyInstanceForJS(value);
        },

        /**
         * Fetches a reference to a static property of this object's class by its name
         *
         * @param {Reference|Value} nameValue
         * @returns {StaticPropertyReference|UndeclaredStaticPropertyReference}
         */
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
                objectValue,
                unwrappedArgs;

            if (value.getClassName() !== 'JSObject') {
                // A normal PHP object is being instantiated as a class -
                // we just need to create a new instance of this object's class
                return value.classObject.instantiate(args);
            }

            // A JS function is being instantiated as a class from PHP (bridge integration)

            if (!_.isFunction(value.value)) {
                throw new Error('Cannot create a new instance of a non-function JSObject');
            }

            // Unwrap the arguments to native values (as the constructor will be native JS)
            unwrappedArgs = _.map(args, function (argValue) {
                return argValue.getNative();
            });

            /**
             * Create a new instance of the native class, using bind.apply(...)
             * to support passing varargs to the constructor (and ES6+ classes).
             *
             * JS constructor functions can override the normal constructor process
             * and return a completely different object, which this will handle automatically too.
             */
            nativeObject = new (function () {}.bind.apply(value.value, [undefined].concat(unwrappedArgs)))();

            objectValue = value.factory.coerceObject(nativeObject);

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

        /**
         * Determines whether the object this reference resolves to is an instance of the specified class
         *
         * @param {Reference|Value} classNameValue
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @return {BooleanValue}
         */
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
         * Determines whether the class of this object defines an instance or static method with the given name
         *
         * @param {string} methodName
         * @returns {boolean}
         */
        isMethodDefined: function (methodName) {
            return this.classObject.getMethodSpec(methodName) !== null;
        },

        /**
         * Determines whether this iterator has finished iterating or not.
         * Used by transpiled foreach loops over objects implementing Iterator.
         *
         * @return {boolean}
         */
        isNotFinished: function () {
            var value = this;

            if (!value.classIs('Iterator')) {
                throw new Exception('ObjectValue.isNotFinished() :: Object does not implement Iterator');
            }

            return value.callMethod('valid').coerceToBoolean().getNative();
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
