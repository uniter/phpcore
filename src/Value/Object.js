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
        PHPError = phpCommon.PHPError,
        PHPFatalError = phpCommon.PHPFatalError,
        PHPParseError = phpCommon.PHPParseError,

        CANNOT_ACCESS_PROPERTY = 'core.cannot_access_property',
        CANNOT_USE_WRONG_TYPE_AS = 'core.cannot_use_wrong_type_as',
        OBJECT_FROM_GET_ITERATOR_MUST_BE_TRAVERSABLE = 'core.object_from_get_iterator_must_be_traversable',
        UNCAUGHT_EMPTY_THROWABLE = 'core.uncaught_empty_throwable',
        UNCAUGHT_THROWABLE = 'core.uncaught_throwable',
        UNDEFINED_PROPERTY = 'core.undefined_property',
        UNSUPPORTED_OPERAND_TYPES = 'core.unsupported_operand_types';

    /**
     * Represents an instance of a class. There is a JS<->PHP bridge
     * that wraps objects passed in from JS-land in instances of a special JSObject builtin class.
     *
     * @param {ValueFactory} factory
     * @param {CallStack} callStack
     * @param {Translator} translator
     * @param {object} object
     * @param {Class} classObject
     * @param {number} id
     * @constructor
     */
    function ObjectValue(factory, callStack, translator, object, classObject, id) {
        Value.call(this, factory, callStack, 'object', object);

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
         * Adds this value to another
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        add: function (rightValue) {
            return rightValue.addToObject(this);
        },

        /**
         * Adds this value to an array
         */
        addToArray: function () {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Object of class ' + value.classObject.getName() + ' could not be converted to number'
            );

            value.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
        },

        /**
         * Adds this value to a boolean
         *
         * @param {BooleanValue} booleanValue
         */
        addToBoolean: function (booleanValue) {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Object of class ' + value.classObject.getName() + ' could not be converted to number'
            );

            return value.factory.createInteger((booleanValue.getNative() ? 1 : 0) + 1);
        },

        /**
         * Adds this value to a float
         *
         * @param {FloatValue} floatValue
         */
        addToFloat: function (floatValue) {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Object of class ' + value.classObject.getName() + ' could not be converted to number'
            );

            return value.factory.createFloat(floatValue.getNative() + 1);
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
         * @returns {Reference|Value}
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
         * @returns {boolean}
         */
        classIs: function (className) {
            return this.classObject.is(className);
        },

        /**
         * Returns a clone of this object value
         *
         * @returns {ObjectValue}
         */
        clone: function () {
            var value = this,
                // Avoid calling the __construct() class constructor when cloning,
                // however note that the native constructor will still be called
                // as that is used to initialise properties for PHP-defined classes etc.
                cloneObjectValue = value.classObject.instantiateBare(
                    // TODO: Consider storing the arguments passed to the constructor,
                    //       so that they may be passed here - however this may then leak memory
                    //       as we would be holding on to references to those arguments' values
                    []
                );

            // Clones are shallow: each property's value is simply copied over to the clone.
            // (Note that arrays will be copied as is done for assignments.)
            // If a deep clone is required then the user must implement the magic __clone method
            // and perform the recursion themselves.
            _.each(value.getPropertyNames(), function (name) {
                cloneObjectValue.setProperty(name, value.getProperty(name));
            });

            // Call the magic __clone method if defined
            if (cloneObjectValue.isMethodDefined(MAGIC_CLONE)) {
                cloneObjectValue.callMethod(MAGIC_CLONE);
            }

            return cloneObjectValue;
        },

        /**
         * Coerces this ObjectValue to an ArrayValue
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

        coerceToBoolean: function () {
            return this.factory.createBoolean(true);
        },

        coerceToInteger: function () {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Object of class ' + value.classObject.getName() + ' could not be converted to number'
            );

            return value.factory.createInteger(1);
        },

        /**
         * Unwraps this instance of Exception to a native JS error
         *
         * @returns {Error}
         */
        coerceToNativeError: function () {
            var message,
                value = this;

            // Uncaught PHP Throwables become E_FATAL errors

            if (!value.classIs('Throwable')) {
                // TODO: Change for PHP 7:
                //       "Fatal error: Uncaught Error: Can only throw objects in Command line code:1"
                //       "Fatal error: Uncaught Error: Cannot throw objects that do not implement Throwable in Command line code:1"
                //       These will probably need to be handled with transpiler-level changes,
                //       so that a throw statement becomes eg. `tools.throw(...)` as it is too late
                //       to make these checks at this point, due to the original context being lost
                throw new Exception('Weird value class thrown: ' + value.getClassName());
            }

            if (value.classIs('ParseError')) {
                return new PHPParseError(
                    value.getProperty('message').getNative(),
                    value.getProperty('file').getNative(),
                    value.getProperty('line').getNative()
                );
            }

            message = value.getProperty('message').getNative();

            if (message !== '') {
                message = value.translator.translate(UNCAUGHT_THROWABLE, {
                    name: value.getClassName(),
                    message: message
                });
            } else {
                message = value.translator.translate(UNCAUGHT_EMPTY_THROWABLE, {
                    name: value.getClassName()
                });
            }

            return new PHPFatalError(
                message,
                value.getProperty('file').getNative(),
                value.getProperty('line').getNative()
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
                return new PropertyReference(
                    value.factory,
                    value.callStack,
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

                return new NullReference(value.factory);
            }

            return value.getInstancePropertyByName(names[index]);
        },

        /**
         * Fetches a property of this object using the array dereference notation if its class implements ArrayAccess
         *
         * @param {*} keyValue
         * @returns {Reference}
         */
        getElementByKey: function (keyValue) {
            var value = this;

            keyValue = keyValue.coerceToKey(value.callStack);

            if (!keyValue) {
                // Could not be coerced to a key: error will already have been handled, just return NULL
                return new NullReference(value.factory);
            }

            if (value.classObject.is('ArrayAccess')) {
                return new ObjectElement(value.factory, value, keyValue);
            }

            value.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_USE_WRONG_TYPE_AS, {
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
                // Property is private, and we're inside the class that defines it so we're good to go.
                // Private properties should be the most common, so this is the first case for speed
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
                 * but this _should_ be a rare scenario so it makes sense not to optimise for it
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
         * @returns {ArrayIterator|ObjectValue}
         */
        getIterator: function () {
            var value = this,
                iteratorValue = value;

            value.pointer = 0;

            if (iteratorValue.classIs('IteratorAggregate')) {
                // IteratorAggregate requires its ->getIterator() method to return something iterable
                iteratorValue = iteratorValue.callMethod('getIterator');

                if (iteratorValue.getType() !== 'object' || !iteratorValue.classIs('Iterator')) {
                    throw value.factory.createTranslatedExceptionObject(
                        'Exception',
                        OBJECT_FROM_GET_ITERATOR_MUST_BE_TRAVERSABLE,
                        {
                            className: value.getClassName()
                        }
                    );
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

                _.forOwn(value.nonPrivateProperties, function (propertyReference, propertyName) {
                    result[propertyName] = propertyReference.getValue().getNative();
                });

                return result;
            }

            return value.classObject.unwrapInstanceForJS(value, value.value);
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
            var value = this;

            if (!(value.value instanceof Closure)) {
                throw new Error('bindClosure() :: Value is not a Closure');
            }

            return value.value.invoke(args);
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

            return value.classIs('Closure') ||
                value.isMethodDefined('__invoke');
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

        /**
         * Determines whether this object is equal (but not necessarily identical) to another
         *
         * @param {ObjectValue} rightValue
         * @returns {BooleanValue}
         */
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

            // Check public and protected properties
            _.forOwn(rightValue.nonPrivateProperties, function (propertyReference, propertyName) {
                if (
                    !hasOwn.call(leftValue.nonPrivateProperties, propertyName) ||
                    propertyReference.getValue().isNotEqualTo(
                        leftValue.nonPrivateProperties[propertyName].getValue()
                    ).getNative()
                ) {
                    equal = false;
                    return false;
                }
            });
            // Check private properties
            _.forOwn(rightValue.privatePropertiesByFQCN, function (propertyReferences, fqcn) {
                _.forOwn(propertyReferences, function (propertyReference, propertyName) {
                    if (
                        !hasOwn.call(leftValue.privatePropertiesByFQCN, fqcn) ||
                        !hasOwn.call(leftValue.privatePropertiesByFQCN[fqcn], propertyName) ||
                        propertyReference.getValue().isNotEqualTo(
                            leftValue.privatePropertiesByFQCN[fqcn][propertyName].getValue()
                        ).getNative()
                    ) {
                        equal = false;
                        return false;
                    }
                });
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
         * @returns {boolean}
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

        /**
         * Moves the internal array-like pointer to the specified property
         *
         * @param {PropertyReference} propertyReference
         */
        pointToProperty: function (propertyReference) {
            var index = 0,
                propertyName = propertyReference.getKey().getNative(),
                value = this;

            // Find the property in the set of properties visible to the current scope
            _.each(value.getInstancePropertyNames(), function (name) {
                if (name.getNative() === propertyName) {
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
