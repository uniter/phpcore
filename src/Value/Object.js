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
        MAGIC_CLONE = '__clone',
        MAGIC_TO_STRING = '__toString',
        PHPError = phpCommon.PHPError,

        CANNOT_ACCESS_PROPERTY = 'core.cannot_access_property',
        CANNOT_CONVERT_OBJECT = 'core.cannot_convert_object',
        CANNOT_DECREMENT = 'core.cannot_decrement',
        CANNOT_INCREMENT = 'core.cannot_increment',
        CANNOT_USE_WRONG_TYPE_AS = 'core.cannot_use_wrong_type_as',
        NESTING_LEVEL_TOO_DEEP = 'core.nesting_level_too_deep',
        OBJECT_FROM_GET_ITERATOR_MUST_BE_TRAVERSABLE = 'core.object_from_get_iterator_must_be_traversable',
        UNDEFINED_PROPERTY = 'core.undefined_property';

    /**
     * Represents an instance of a class. There is a JS<->PHP bridge
     * that wraps objects passed in from JS-land in instances of a special JSObject builtin class.
     *
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {Flow} flow
     * @param {Translator} translator
     * @param {object} object
     * @param {Class} classObject
     * @param {number} id
     * @constructor
     */
    function ObjectValue(
        factory,
        referenceFactory,
        futureFactory,
        callStack,
        flow,
        translator,
        object,
        classObject,
        id
    ) {
        Value.call(this, factory, referenceFactory, futureFactory, callStack, flow, 'object', object);

        /**
         * @type {Class}
         */
        this.classObject = classObject;
        /**
         * @type {number}
         */
        this.id = id;
        /**
         * Internal properties allow JS-defined classes to store data against objects
         * without exposing it to PHP-land, which avoids the risk of any internal data names
         * conflicting with PHP class properties
         *
         * @type {Object.<string, *>}
         */
        this.internalProperties = {};
        /**
         * Used for recursive loose comparison detection.
         *
         * @type {boolean}
         */
        this.isBeingCompared = false;
        /**
         * @type {number}
         */
        this.nextPropertyIndex = 0;
        /**
         * @type {Object.<string, PropertyReference>}
         */
        this.nonPrivateProperties = {};
        /**
         * @type {number}
         */
        this.pointer = 0;
        /**
         * Different classes in the hierarchy may declare their own private property
         * with the same name as an ancestor. For this reason we need to store private properties
         * indexed by the fully-qualified name of the class that defines them
         * (Effectively: {Object.<string, {Object.<string, PropertyReference>}>})
         *
         * @type {Object.<string, object>}
         */
        this.privatePropertiesByFQCN = {};
        /**
         * @type {Translator}
         */
        this.translator = translator;
    }

    util.inherits(ObjectValue, Value);

    _.extend(ObjectValue.prototype, {
        /**
         * Moves the iterator to its next position.
         * Used by transpiled foreach loops over objects implementing Iterator.
         *
         * @returns {ChainableInterface<Value>}
         */
        advance: function () {
            var value = this;

            if (!value.classIs('Iterator')) {
                throw new Exception('Object.advance() :: Object does not implement Iterator');
            }

            // Note that the return value is ignored, but may be a Future-wrapped Value which we must yield to.
            return value.callMethod('next');
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
            var closure,
                value = this;

            if (!value.classIs('Closure')) {
                throw new Error('bindClosure() :: Value is not a Closure');
            }

            closure = value.getInternalProperty('closure');

            return closure.bind(thisValue, scopeClass);
        },

        /**
         * Calls the magic __invoke() method for this object
         *
         * @param {Reference[]|Value[]|Variable[]} args
         * @returns {Reference|Value}
         */
        call: function (args) {
            var value = this;

            return value.classIs('Closure') ?
                // For a closure, invoke it directly rather than via the wrapped __invoke() method
                // of the builtin Closure class, both for performance and to avoid adding a stack frame
                // for the __invoke() call, which is not present in the reference implementation.
                value.invokeClosure(args) :
                // For all other types of object there is no such shortcut.
                value.callMethod('__invoke', args);
        },

        /**
         * Calls the specified method of this object
         *
         * @param {string} name
         * @param {Value[]?} args
         * @returns {Value} Returns the result of the method if it exists
         * @throws {PHPFatalError} Throws when the method does not exist
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
         * @param {bool} isForwarding eg. self::f() is forwarding, MyParentClass::f() is non-forwarding
         * @returns {Value}
         */
        callStaticMethod: function (nameValue, args, isForwarding) {
            // Could be a static call in object context, in which case we want to pass
            // the object value through.
            // This will be handled by a fetch of `callStack.getThisObject()` inside `.callMethod(...)`
            return this.classObject.callMethod(nameValue.getNative(), args, null, null, null, isForwarding);
        },

        /**
         * Determines whether this object is an instance of the given class
         *
         * @param {string} className
         * @returns {boolean}
         */
        classIs: function (className) {
            return this.classObject.is(className);
        },

        /**
         * Returns a clone of this object value. Note that the userland __clone() method, if defined,
         * may pause, in which case a Future-wrapped Value will be returned that eventually resolves to the clone.
         *
         * @returns {ChainableInterface<ObjectValue>}
         */
        clone: function () {
            var value = this,
                // Avoid calling the __construct() class constructor when cloning,
                // however note that the native constructor will still be called
                // as that is used to initialise properties for PHP-defined classes etc.
                cloneObjectValue,
                nativeObject;

            // TODO: Move to Class and make configurable for native definitions
            //       via .defineCloner(...)
            if (value.classIs('JSObject')) {
                // Create a new native object with the same [[Prototype]] as the original.
                nativeObject = Object.create(Object.getPrototypeOf(value.value));

                // Copy enumerable own properties to the clone.
                _.extend(nativeObject, value.value);

                // Wrap the clone as an ObjectValue<JSObject>.
                return value.factory.createBoxedJSObject(nativeObject);
            }

            cloneObjectValue = value.classObject.instantiateBare();

            // Clones are shallow: each property's value is simply copied over to the clone.
            // (Note that arrays will be copied as is done for assignments.)
            // If a deep clone is required then the user must implement the magic __clone method
            // and perform the recursion themselves.
            _.each(value.getPropertyNames(), function (name) {
                cloneObjectValue.setProperty(name, value.getProperty(name));
            });

            // Call the magic __clone method if defined
            if (cloneObjectValue.isMethodDefined(MAGIC_CLONE)) {
                // Note that this could pause by returning a Future-wrapped Value, which we handle.
                return cloneObjectValue.callMethod(MAGIC_CLONE).next(function () {
                    return cloneObjectValue;
                });
            }

            return cloneObjectValue;
        },

        /**
         * Coerces this ObjectValue to an ArrayValue (overrides the implementation in Value)
         *
         * @returns {ArrayValue}
         */
        coerceToArray: function () {
            var elements = [],
                value = this,
                factory = value.factory;

            _.forOwn(value.nonPrivateProperties, function (propertyReference) {
                elements.push(
                    new KeyValuePair(
                        factory.coerce(propertyReference.getExternalName()),
                        propertyReference.getValue()
                    )
                );
            });
            _.forOwn(value.privatePropertiesByFQCN, function (fqcnMap) {
                _.forOwn(fqcnMap, function (propertyReference) {
                    elements.push(
                        new KeyValuePair(
                            factory.coerce(propertyReference.getExternalName()),
                            propertyReference.getValue()
                        )
                    );
                });
            });

            return value.factory.createArray(elements);
        },

        /**
         * {@inheritdoc}
         */
        coerceToBoolean: function () {
            return this.factory.createBoolean(true);
        },

        /**
         * {@inheritdoc}
         */
        coerceToFloat: function () {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Object of class ' + value.classObject.getName() + ' could not be converted to float'
            );

            return value.factory.createFloat(1);
        },

        /**
         * {@inheritdoc}
         */
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
         * TODO: Move the Throwable check elsewhere and deprecate this method in favour of .getNative()?
         *
         * @returns {Error|*}
         */
        coerceToNativeError: function () {
            var value = this;

            // Uncaught PHP Throwables become E_FATAL errors

            if (!value.classIs('Throwable')) {
                /*
                 * Note that this should not be possible, as the "throw_" opcode handler
                 * should throw the specific PHP error for an instance of a non-Throwable class:
                 *
                 * "Cannot throw objects that do not implement Throwable".
                 */
                throw new Exception('Weird value class thrown: ' + value.getClassName());
            }

            return value.getNative();
        },

        coerceToKey: function () {
            this.callStack.raiseError(PHPError.E_WARNING, 'Illegal offset type');
        },

        coerceToObject: function () {
            // Already an object: no coercion needed
            return this;
        },

        /**
         * {@inheritdoc}
         *
         * @throws {ObjectValue} Raises an error when the class does not implement ->__toString()
         */
        coerceToString: function () {
            var value = this;

            if (!value.isMethodDefined(MAGIC_TO_STRING)) {
                // Class does not implement ->__toString() magic, so instances cannot be coerced.
                value.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    CANNOT_CONVERT_OBJECT,
                    {
                        className: value.classObject.getName(),
                        type: 'string'
                    }
                );
            }

            return value.callMethod(MAGIC_TO_STRING);
        },

        /**
         * {@inheritdoc}
         */
        compareWith: function (rightValue) {
            return rightValue.compareWithObject(this);
        },

        /**
         * {@inheritdoc}
         */
        compareWithArray: function () {
            // Arrays (even non-empty ones) are always smaller than objects.
            return this.futureFactory.createPresent(-1);
        },

        /**
         * {@inheritdoc}
         */
        compareWithBoolean: function (leftValue) {
            var booleanValue = leftValue.getNative();

            return booleanValue ? 0 : -1;
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
                leftInteger = leftValue.getNative(),
                rightInteger = rightValue.coerceToInteger().getNative();

            if (leftInteger < rightInteger) {
                return -1;
            }

            if (leftInteger > rightInteger) {
                return 1;
            }

            return 0;
        },

        /**
         * {@inheritdoc}
         */
        compareWithNull: function () {
            return -1; // Null is always smaller than an object.
        },

        /**
         * {@inheritdoc}
         */
        compareWithObject: function (leftValue) {
            var comparisonResult = 0,
                rightValue = this;

            if (rightValue.getClassName() !== leftValue.getClassName()) {
                /*
                 * Objects of different classes cannot be compared.
                 * Note that this null result will cause ==, !=, < and > to all return false,
                 * but the spaceship operator will return 1.
                 */
                return rightValue.futureFactory.createPresent(null);
            }

            if (leftValue.getLength() < rightValue.getLength()) {
                // With fewer properties, left value will always be considered smaller,
                // even if its corresponding properties are themselves larger.
                return rightValue.futureFactory.createPresent(-1);
            }

            if (leftValue.getLength() > rightValue.getLength()) {
                // See above.
                return rightValue.futureFactory.createPresent(1);
            }

            if (rightValue.isBeingCompared) {
                // This object is being compared recursively, which will never complete.
                rightValue.callStack.raiseTranslatedError(PHPError.E_ERROR, NESTING_LEVEL_TOO_DEEP);
            }

            // Set a flag to allow detection of recursion.
            rightValue.isBeingCompared = true;

            // Check public and protected properties.
            return rightValue.flow.forOwnAsync(leftValue.nonPrivateProperties, function (propertyReference, propertyName) {
                if (!hasOwn.call(rightValue.nonPrivateProperties, propertyName)) {
                    // Left object contains a property that the right does not: consider left object greater.
                    comparisonResult = 1;
                    return false;
                }

                // Note that defined properties' values should always be present, so there should be no need
                // for async/Futures handling here.
                return propertyReference.getValue()
                    .compareWith(rightValue.nonPrivateProperties[propertyName].getValue())
                    .next(function (propertyComparisonResult) {
                        if (propertyComparisonResult !== 0) {
                            // Property has a different value in left object than the right:
                            // use comparison result (will be either -1 or 1).
                            comparisonResult = propertyComparisonResult;
                            return false;
                        }
                    });
            })
                .next(function () {
                    if (comparisonResult !== 0) {
                        // We have already found a difference, no need to now check private properties.
                        return comparisonResult;
                    }

                    // Check private properties.
                    return rightValue.flow.forOwnAsync(leftValue.privatePropertiesByFQCN, function (propertyReferences, fqcn) {
                        return rightValue.flow.forOwnAsync(propertyReferences, function (propertyReference, propertyName) {
                            if (
                                !hasOwn.call(rightValue.privatePropertiesByFQCN, fqcn) ||
                                !hasOwn.call(rightValue.privatePropertiesByFQCN[fqcn], propertyName)
                            ) {
                                // Left object contains a property that the right does not: consider left object greater.
                                comparisonResult = 1;
                                return false;
                            }

                            // Note that defined properties' values should always be present, so there should be no need
                            // for async/Futures handling here.
                            return propertyReference.getValue()
                                .compareWith(rightValue.privatePropertiesByFQCN[fqcn][propertyName].getValue())
                                .next(function (propertyComparisonResult) {
                                    if (propertyComparisonResult !== 0) {
                                        // Property has a different value in left object than the right:
                                        // use comparison result (will be either -1 or 1).
                                        comparisonResult = propertyComparisonResult;
                                        return false;
                                    }
                                });
                        });
                    });
                })
                .finally(function () {
                    // Clear recursion detection flag.
                    rightValue.isBeingCompared = false;
                })
                .next(function () {
                    return comparisonResult;
                });
        },

        /**
         * {@inheritdoc}
         */
        compareWithResource: function () {
            return -1; // Objects (even empty ones) are always greater.
        },

        /**
         * {@inheritdoc}
         */
        compareWithString: function (leftValue) {
            var rightValue = this;

            if (!rightValue.isMethodDefined(MAGIC_TO_STRING)) {
                // Objects (even empty ones) are always greater.
                return rightValue.futureFactory.createPresent(-1);
            }

            return rightValue.callMethod(MAGIC_TO_STRING)
                .next(function (rightStringValue) {
                    return leftValue.compareWithString(rightStringValue);
                });
        },

        /**
         * {@inheritdoc}
         */
        convertForStringType: function () {
            var value = this;

            return value.isMethodDefined(MAGIC_TO_STRING) ?
                value.callMethod(MAGIC_TO_STRING) :
                // Return the object value unchanged if ->__toString() not defined.
                // Note that this behaviour differs from .coerceToString().
                value;
        },

        /**
         * Declares an instance property for this object, with the specified visibility
         *
         * @param {string} name
         * @param {Class} classObject The class in the hierarchy that defines the property
         * @param {string} visibility "private", "protected" or "public"
         * @returns {PropertyReference}
         */
        declareProperty: function (name, classObject, visibility) {
            var value = this,
                propertyReference;

            function createProperty() {
                return value.referenceFactory.createProperty(
                    value,
                    value.factory.coerce(name),
                    classObject,
                    visibility,
                    value.nextPropertyIndex++
                );
            }

            if (visibility === 'private') {
                if (!value.privatePropertiesByFQCN[classObject.getName()]) {
                    value.privatePropertiesByFQCN[classObject.getName()] = {};
                }

                propertyReference = value.privatePropertiesByFQCN[classObject.getName()][name];

                if (!propertyReference) {
                    propertyReference = createProperty();

                    value.privatePropertiesByFQCN[classObject.getName()][name] = propertyReference;
                }
            } else {
                propertyReference = value.nonPrivateProperties[name];

                if (!propertyReference) {
                    propertyReference = createProperty();

                    value.nonPrivateProperties[name] = propertyReference;
                }
            }

            return propertyReference;
        },

        /**
         * {@inheritdoc}
         */
        decrement: function () {
            var value = this;

            value.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_DECREMENT, {
                'type': value.getDisplayType()
            }, 'TypeError');
        },

        /**
         * Builds a string representation of this value
         *
         * @returns {string}
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
                return value.value.functionSpec.getFunctionName(true);
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
         * @returns {string}
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
            var propertyName,
                propertyNames,
                value = this;

            if (value.classIs('Iterator')) {
                return value.callMethod('current');
            }

            // Otherwise we're treating the object as an array.
            propertyNames = value.getInstancePropertyNames();

            if (propertyNames.length === 0) {
                // Object is empty so can have no current value.
                return value.factory.createNull();
            }

            if (value.pointer >= propertyNames.length) {
                // Internal property pointer is invalid.
                throw new Exception('ObjectValue.getCurrentElementValue() :: Pointer is invalid');
            }

            propertyName = propertyNames[value.pointer];

            return value.getInstancePropertyByName(value.factory.coerce(propertyName)).getValue();
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

            return value.callMethod('key')
                .asValue()
                .next(function (value) {
                    return value.coerceToKey();
                });
        },

        /**
         * {@inheritdoc}
         */
        getDisplayType: function () {
            // For objects, we want to display the class FQCN and not just "object"
            return this.getClassName();
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

                return value.referenceFactory.createNull();
            }

            return value.getInstancePropertyByName(names[index]);
        },

        /**
         * Fetches a property of this object using the array dereference notation if its class implements ArrayAccess
         *
         * @param {Value} keyValue
         * @returns {Reference}
         */
        getElementByKey: function (keyValue) {
            var value = this;

            // Note that we do not call keyValue.coerceToKey(...) as any value may be used as a key for ArrayAccess.

            if (value.classObject.is('ArrayAccess')) {
                return value.referenceFactory.createObjectElement(value, keyValue);
            }

            value.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_USE_WRONG_TYPE_AS, {
                actual: value.classObject.getName(),
                expected: 'array'
            });
        },

        /**
         * Returns either the current value or one based on it as part of an assignment.
         * Objects are passed around by reference so this should just return this.
         *
         * @returns {Value}
         */
        getForAssignment: function () {
            return this;
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
         * Fetches a list of key Values for this object when treated as an array,
         * which corresponds to its instance properties.
         *
         * @returns {Value[]}
         */
        getKeys: function () {
            return this.getInstancePropertyNames();
        },

        /**
         * {@inheritdoc}
         */
        getOutgoingValues: function () {
            // NB: Don't include values via the class, e.g. static property values,
            //     as those will be captured separately during GC root discovery.

            var outgoingValues = [],
                value = this;

            _.each(value.getInstancePropertyNames(), function (nameValue) {
                var property = value.getInstancePropertyByName(nameValue),
                    propertyValue = property.getValueOrNativeNull();

                if (propertyValue && propertyValue.isStructured()) {
                    // Property value is structured so can be marked for GC.
                    outgoingValues.push(propertyValue);
                }
            });

            return outgoingValues;
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
         * {@inheritdoc}
         */
        getPushElement: function () {
            var value = this;

            return value.referenceFactory.createObjectElement(value, value.factory.createNull());
        },

        /**
         * Fetches an instance property of this object
         *
         * @param {Value} nameValue
         * @returns {PropertyReference}
         */
        getInstancePropertyByName: function (nameValue) {
            var callingClass,
                nameKey = nameValue.coerceToKey(),
                name = nameKey.getNative(),
                propertyReference,
                value = this,
                classInHierarchy,
                classOfObject = value.classObject;

            if (value.classObject.hasStaticPropertyByName(name)) {
                // TODO: Change for PHP 7 (see https://www.php.net/manual/en/migration70.incompatible.php)
                value.callStack.raiseError(
                    PHPError.E_STRICT,
                    'Accessing static property ' + value.classObject.getName() + '::$' + name + ' as non static'
                );

                // Allow to continue, so that a further notice will be emitted when the property is accessed
            }

            // Fetch the class that the current line of PHP code is executing inside (if any)
            callingClass = value.callStack.getCurrentClass();

            // First check whether the property is defined as private for the calling class -
            // it could also exist at different levels in the hierarchy, but the same property
            // can have different values at different levels if it is private there
            propertyReference = callingClass && value.privatePropertiesByFQCN[callingClass.getName()] ?
                value.privatePropertiesByFQCN[callingClass.getName()][name] :
                null;

            if (propertyReference) {
                // Property is private, and we're inside the class that defines it, so we're good to go.
                // Private properties should be the most common, so this is the first case for speed.
                return propertyReference;
            }

            propertyReference = value.nonPrivateProperties[name];

            if (propertyReference) {
                /*
                 * Property is protected; may be read from methods of this class and methods of derivatives.
                 * This case is checked before the privates-check hierarchy walk below for speed,
                 * as invalid accesses to private properties should be rare
                 */
                if (propertyReference.getVisibility() === 'protected') {
                    if (
                        !callingClass ||
                        (
                            classOfObject.getName() !== callingClass.getName() &&
                            !callingClass.isInFamilyOf(classOfObject)
                        )
                    ) {
                        value.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_ACCESS_PROPERTY, {
                            className: classOfObject.getName(),
                            propertyName: name,
                            visibility: 'protected'
                        });
                    }
                }
            } else {
                classInHierarchy = classOfObject;

                // Check whether the property is in fact defined, but is defined as private
                // for a class that is not the calling class - if so then we are not allowed to access it
                do {
                    propertyReference = value.privatePropertiesByFQCN[classInHierarchy.getName()] ?
                        value.privatePropertiesByFQCN[classInHierarchy.getName()][name] :
                        null;

                    if (propertyReference) {
                        if (callingClass && callingClass.extends(classInHierarchy)) {
                            // We're in a class that is a descendant of the one that defines the private property
                            value.callStack.raiseTranslatedError(PHPError.E_ERROR, UNDEFINED_PROPERTY, {
                                className: callingClass.getName(),
                                propertyName: name
                            });
                        } else if (callingClass && classInHierarchy !== classOfObject) {
                            // The current object is a descendant of the one that defines the private property,
                            // but we're in a class that is an ancestor of the definer -
                            // just treat the property as not defined
                            break;
                        } else {
                            // Property is private, but we're not trying to access it from inside the class
                            value.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_ACCESS_PROPERTY, {
                                className: classOfObject.getName(),
                                propertyName: name,
                                visibility: 'private'
                            });
                        }
                    }

                    classInHierarchy = classInHierarchy.getSuperClass();
                } while (classInHierarchy !== null);

                /*
                 * Property is not yet defined for this object by any of its class hierarchy or dynamically -
                 * define it dynamically as a public property.
                 * This is a relatively slow case as it is only done after the privates-check hierarchy walk above,
                 * but this _should_ be a rare scenario, so it makes sense not to optimise for it.
                 */
                propertyReference = value.declareProperty(name, value.classObject, 'public');
            }

            return propertyReference;
        },

        /**
         * Fetches the names of all visible instance properties of this object, wrapped as values
         *
         * @returns {Value[]}
         */
        getInstancePropertyNames: function () {
            var callingClass,
                nameHash = {},
                sortedNames,
                value = this;

            // Include the names of all properties of the wrapped native object
            // TODO: Move this custom logic to JSObject, called via a magic method?
            _.forOwn(value.value, function (value, name) {
                nameHash[name] = -1;
            });

            // Fetch the class that the current line of PHP code is executing inside (if any)
            callingClass = value.callStack.getCurrentClass();

            // Include the names of all private properties defined on the calling class
            if (callingClass) {
                _.forOwn(value.privatePropertiesByFQCN, function (propertyReferences, fqcn) {
                    if (fqcn === callingClass.getName()) {
                        _.forOwn(propertyReferences, function (propertyReference, propertyName) {
                            if (propertyReference.isDefined()) {
                                nameHash[propertyName] = propertyReference.getIndex();
                            }
                        });
                    }
                });
            }

            // Include all public properties and all protected properties that belong
            // to ancestor or descendant classes of the calling class
            _.forOwn(value.nonPrivateProperties, function (propertyReference, propertyName) {
                if (propertyReference.isDefined() && propertyReference.isVisible()) {
                    nameHash[propertyName] = propertyReference.getIndex();
                }
            });

            sortedNames = Object.keys(nameHash);
            sortedNames.sort(function (nameA, nameB) {
                return nameHash[nameA] - nameHash[nameB];
            });

            // Wrap all the names in Value objects before returning
            return sortedNames.map(function (name) {
                return value.factory.coerce(name);
            });
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
         * @returns {ChainableInterface<ArrayIterator|GeneratorIterator|ObjectValue>}
         */
        getIterator: function () {
            var value = this,
                iterator,
                iteratorFutureValue = value;

            value.pointer = 0;

            if (value.classIs('IteratorAggregate')) {
                // IteratorAggregate requires its ->getIterator() method to return something iterable
                iteratorFutureValue = value.callMethod('getIterator')
                    .next(function (iteratorValue) {
                        if (iteratorValue.getType() !== 'object' || !iteratorValue.classIs('Iterator')) {
                            throw value.factory.createTranslatedExceptionObject(
                                'Exception',
                                OBJECT_FROM_GET_ITERATOR_MUST_BE_TRAVERSABLE,
                                {
                                    className: value.getClassName()
                                }
                            );
                        }

                        return iteratorValue;
                    });
            } else if (value.classIs('Generator')) {
                iterator = value.getInternalProperty('iterator');

                return value.futureFactory.createPresent(iterator);
            } else if (!value.classIs('Iterator')) {
                // Objects not implementing Traversable are iterated like arrays
                return value.futureFactory.createPresent(value.factory.createArrayIterator(value));
            }

            // At this point, iteratorFutureValue will either be the original ObjectValue if it implemented Iterator
            // or the result of calling ->getIterator() if it implemented IteratorAggregate

            return iteratorFutureValue.next(function (iteratorValue) {
                return iteratorValue.callMethod('rewind').next(function () {
                    return iteratorValue;
                });
            });
        },

        /**
         * Fetches a key (property name) of this object by its index
         *
         * @param {number} index
         * @returns {Value|null}
         */
        getKeyByIndex: function (index) {
            var value = this,
                keys = value.getInstancePropertyNames();

            return keys[index] || null;
        },

        /**
         * Fetches the length (number of properties) for this object, regardless of their visibility
         *
         * @returns {number}
         */
        getLength: function () {
            var value = this,
                // Fetch the class that the current line of PHP code is executing inside (if any)
                callingClass = value.callStack.getCurrentClass(),
                count = 0;

            // Include the names of all private properties defined on the calling class
            if (callingClass) {
                _.forOwn(value.privatePropertiesByFQCN, function (propertyReferences, fqcn) {
                    if (fqcn === callingClass.getName()) {
                        _.forOwn(propertyReferences, function (propertyReference) {
                            if (propertyReference.isDefined()) {
                                count++;
                            }
                        });
                    }
                });
            }

            // Include all public properties and all protected properties that belong
            // to ancestor or descendant classes of the calling class
            _.forOwn(value.nonPrivateProperties, function (propertyReference) {
                if (propertyReference.isDefined() && propertyReference.isVisible()) {
                    count++;
                }
            });

            return count;
        },

        /**
         * Unwraps this PHP object value to something that non-PHPCore JS code will understand.
         * Special PHP classes like Closure and stdClass are unwrapped specially
         *
         * @returns {Object|*}
         */
        getNative: function () {
            var value = this;

            return value.classObject.exportInstanceForJS(value);
        },

        /**
         * Fetches a map of all non-private property names to values
         *
         * @returns {Object.<string, Value>}
         */
        getNonPrivateProperties: function () {
            var value = this,
                propertyNamesToValues = {};

            _.forOwn(value.nonPrivateProperties, function (propertyReference, propertyName) {
                propertyNamesToValues[propertyName] = propertyReference.getValue();
            });

            return propertyNamesToValues;
        },

        /**
         * Fetches the wrapped native JS object
         *
         * @returns {object}
         */
        getObject: function () {
            return this.value;
        },

        getPointer: function () {
            return this.pointer;
        },

        /**
         * Fetches the names of all instance properties of this object
         *
         * @returns {string[]}
         */
        getPropertyNames: function () {
            return this.getInstancePropertyNames().map(function (nameValue) {
                return nameValue.getNative();
            });
        },

        /**
         * Exports a proxy object that allows JS code to call any method of this object
         * (including magic ones implemented with __call)
         *
         * @deprecated Is this required, why not just use a non-coercing function/class?
         *             Also, the concept of "Proxy" is now the replacement for the old "UnwrappedClass"
         *
         * @returns {PHPObject}
         */
        getProxy: function () {
            var value = this;

            return value.classObject.proxyInstanceForJS(value);
        },

        /**
         * Fetches a reference to a static property of this object's class by its name.
         *
         * @param {Reference|Value} nameValue
         * @returns {ChainableInterface<StaticPropertyReference|UndeclaredStaticPropertyReference>}
         */
        getStaticPropertyByName: function (nameValue) {
            return this.classObject.getStaticPropertyByName(nameValue.getNative());
        },

        /**
         * Fetches either this ObjectValue or its inner native object, based on the class' auto-coercion mode
         *
         * @returns {ObjectValue|Object}
         */
        getThisObject: function () {
            var value = this;

            return value.classObject.getThisObjectForInstance(value);
        },

        /**
         * {@inheritdoc}
         */
        increment: function () {
            var value = this;

            value.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_INCREMENT, {
                'type': value.getDisplayType()
            }, 'TypeError');
        },

        /**
         * Creates a new instance of the class of this object for a normal PHP object.
         * For a JSObject, if the wrapped object is a function then it will create
         * a new instance of the wrapped JS class instead,
         * returning the resulting new JSObject instance
         *
         * @param {Value[]} args
         * @returns {ChainableInterface<ObjectValue>}
         */
        instantiate: function (args) {
            var value = this,
                nativeObject,
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

            return value.factory.coerceObject(nativeObject);
        },

        /**
         * Invokes the native function this object wraps when it is an instance of Closure
         *
         * @param {Value[]} args
         * @returns {Value}
         */
        invokeClosure: function (args) {
            var closure,
                value = this;

            if (!value.classIs('Closure')) {
                throw new Error('invokeClosure() :: Value is not a Closure');
            }

            closure = value.getInternalProperty('closure');

            return closure.invoke(args);
        },

        /**
         * Determines whether the object this reference resolves to is an instance of the specified class
         *
         * @param {Reference|Value} classNameValue
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @returns {BooleanValue}
         */
        isAnInstanceOf: function (classNameValue, namespaceOrNamespaceScope) {
            return classNameValue.isTheClassOfObject(this, namespaceOrNamespaceScope);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function () {
            var value = this;

            return value.futureFactory.createPresent(
                value.classIs('Closure') ||
                value.isMethodDefined('__invoke')
            );
        },

        /**
         * Objects are never classed as empty.
         *
         * @returns {ChainableInterface<boolean>}
         */
        isEmpty: function () {
            return this.futureFactory.createPresent(false);
        },

        /**
         * {@inheritdoc}
         */
        isIdenticalTo: function (rightValue) {
            return rightValue.isIdenticalToObject(this);
        },

        /**
         * {@inheritdoc}
         */
        isIdenticalToArray: function () {
            return this.factory.createBoolean(false);
        },

        /**
         * {@inheritdoc}
         */
        isIdenticalToObject: function (rightValue) {
            var leftValue = this,
                factory = leftValue.factory;

            return factory.createBoolean(rightValue.value === leftValue.value);
        },

        /**
         * {@inheritdoc}
         */
        isIterable: function () {
            return this.classIs('Traversable');
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
         * @returns {ChainableInterface<boolean>}
         */
        isNotFinished: function () {
            var value = this;

            if (!value.classIs('Iterator')) {
                throw new Exception('ObjectValue.isNotFinished() :: Object does not implement Iterator');
            }

            return value.callMethod('valid')
                .asValue()
                .next(function (value) {
                    return value.coerceToBoolean().getNative();
                });
        },

        /**
         * Objects are never numeric: always returns false
         *
         * @returns {boolean}
         */
        isNumeric: function () {
            return false;
        },

        /**
         * {@inheritdoc}
         */
        isStructured: function () {
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
         * Generates a human-readable string that refers to a property
         *
         * @param {string} key
         * @returns {string}
         */
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

        /**
         * Sets the value of the specified property. Returns the assigned value.
         *
         * @param {string} name
         * @param {Value} newValue
         * @returns {Value}
         */
        setProperty: function (name, newValue) {
            var value = this,
                nameValue = value.factory.createString(name);

            return value.getInstancePropertyByName(nameValue).setValue(newValue);
        }
    });

    return ObjectValue;
}, {strict: true});
