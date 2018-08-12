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
    require('./Iterator/ArrayIterator'),
    require('./Value/Array'),
    require('./Value/BarewordString'),
    require('./Value/Boolean'),
    require('./Value/Exit'),
    require('./Value/Float'),
    require('./Value/Integer'),
    require('./KeyValuePair'),
    require('./Value/Null'),
    require('./Value/Object'),
    require('./PHPObject'),
    require('./Value/String'),
    require('./Value'),
    require('es6-weak-map')
], function (
    _,
    phpCommon,
    ArrayIterator,
    ArrayValue,
    BarewordStringValue,
    BooleanValue,
    ExitValue,
    FloatValue,
    IntegerValue,
    KeyValuePair,
    NullValue,
    ObjectValue,
    PHPObject,
    StringValue,
    Value,
    WeakMap
) {
    function ValueFactory(pausable, callStack) {
        this.nextObjectID = 1;
        this.callStack = callStack;
        this.globalNamespace = null;
        this.pausable = pausable;
        /**
         * Used for mapping exported unwrapped objects back to their original ObjectValue
         * when they are passed back to PHP-land
         *
         * @type {WeakMap}
         */
        this.unwrappedObjectToValueMap = new WeakMap();
        this.valueToUnwrappedObjectMap = new WeakMap();
    }

    _.extend(ValueFactory.prototype, {
        coerce: function (value) {
            if (value instanceof Value) {
                return value;
            }

            return this.createFromNative(value);
        },
        coerceObject: function (value) {
            var factory = this;

            if (value instanceof Value) {
                return value;
            }

            if (value === null || typeof value === 'undefined') {
                return factory.createNull();
            }

            if (typeof value !== 'object') {
                throw new Error('Only objects, null or undefined may be coerced to an object');
            }

            return factory.createObject(value, factory.globalNamespace.getClass('JSObject'));
        },
        createArray: function (value) {
            var factory = this;

            return new ArrayValue(factory, factory.callStack, value);
        },

        /**
         * Creates an ArrayIterator
         *
         * @param {ArrayValue|ObjectValue} arrayLikeValue
         * @return {ArrayIterator}
         */
        createArrayIterator: function (arrayLikeValue) {
            return new ArrayIterator(arrayLikeValue);
        },

        createBarewordString: function (value) {
            var factory = this;

            return new BarewordStringValue(factory, factory.callStack, value);
        },
        createBoolean: function (value) {
            var factory = this;

            return new BooleanValue(factory, factory.callStack, value);
        },
        createExit: function (statusValue) {
            var factory = this;

            return new ExitValue(factory, factory.callStack, statusValue);
        },
        createFloat: function (value) {
            var factory = this;

            return new FloatValue(factory, factory.callStack, value);
        },
        /**
         * Coerces a native JavaScript value to a suitable *Value object,
         * based on its type. For example, a string primitive value from JS
         * will be coerced to a StringValue instance for PHP
         *
         * @param {*} nativeValue
         * @returns {Value}
         */
        createFromNative: function (nativeValue) {
            var factory = this;

            if (nativeValue === null || typeof nativeValue === 'undefined') {
                return factory.createNull();
            }

            if (_.isString(nativeValue)) {
                return factory.createString(nativeValue);
            }

            if (_.isNumber(nativeValue)) {
                return factory.createInteger(nativeValue);
            }

            if (_.isBoolean(nativeValue)) {
                return factory.createBoolean(nativeValue);
            }

            if (_.isArray(nativeValue)) {
                return factory.createFromNativeArray(nativeValue);
            }

            return factory.createFromNativeObject(nativeValue);
        },
        /**
         * Coerces a native JavaScript object to either an ArrayValue or ObjectValue object,
         * depending on its suitability to be cast as an associative array
         *
         * @param {object} nativeObject
         * @returns {ArrayValue|ObjectValue}
         */
        createFromNativeObject: function (nativeObject) {
            var factory = this,
                hasAMethod = false,
                orderedElements = [];

            if (nativeObject instanceof PHPObject) {
                // PHPObjects wrap instances of PHP classes when exported with .getProxy()
                return nativeObject.getObjectValue();
            }

            if (factory.unwrappedObjectToValueMap.has(nativeObject)) {
                // Objects exported with .getNative() are mapped back to their original ObjectValue
                return factory.unwrappedObjectToValueMap.get(nativeObject);
            }

            // Handle plain objects -> associative arrays
            if (Object.getPrototypeOf(nativeObject) === Object.prototype) {
                _.forOwn(nativeObject, function (value) {
                    if (_.isFunction(value)) {
                        hasAMethod = true;
                        return false;
                    }
                });

                if (!hasAMethod) {
                    // Plain object has no methods: can be safely cast to an associative array
                    _.forOwn(nativeObject, function (value, key) {
                        orderedElements.push(new KeyValuePair(factory.coerce(key), factory.coerce(value)));
                    });

                    return factory.createArray(orderedElements);
                }

                // Plain object, but has methods: needs to be cast to a JSObject
            }

            return factory.createObject(nativeObject, factory.globalNamespace.getClass('JSObject'));
        },
        /**
         * Takes a native Array object and converts it to a wrapped ArrayValue for PHP
         *
         * @param {Array} nativeArray
         * @returns {ArrayValue}
         */
        createFromNativeArray: function (nativeArray) {
            var factory = this,
                orderedElements = [];

            _.each(nativeArray, function (value, index) {
                orderedElements[index] = value;
            });

            _.forOwn(nativeArray, function (value, key) {
                if (!isFinite(key) || key >= nativeArray.length) {
                    orderedElements.push(new KeyValuePair(factory.coerce(key), factory.coerce(value)));
                }
            });

            return factory.createArray(orderedElements);
        },
        createInteger: function (value) {
            var factory = this;

            return new IntegerValue(factory, factory.callStack, value);
        },
        createNull: function () {
            var factory = this;

            return new NullValue(factory, factory.callStack);
        },
        createObject: function (value, classObject) {
            var factory = this;

            // Object ID tracking is incomplete: ID should be freed when all references are lost
            return new ObjectValue(factory, factory.callStack, value, classObject, factory.nextObjectID++);
        },
        createPHPObject: function (object) {
            var factory = this;

            return new PHPObject(factory.pausable, factory, object);
        },
        createStdClassObject: function () {
            var factory = this;

            return factory.globalNamespace.getClass('stdClass').instantiate();
        },
        createString: function (value) {
            var factory = this;

            return new StringValue(factory, factory.callStack, value);
        },

        /**
         * Fetches the unwrapped object that an ObjectValue has been unwrapped to,
         * or returns null if there is no existing mapping
         *
         * @param objectValue
         * @return {object|null}
         */
        getUnwrappedObjectFromValue: function (objectValue) {
            return this.valueToUnwrappedObjectMap.get(objectValue) || null;
        },

        /**
         * Creates an ObjectValue instance of the specified class
         *
         * @param {string} className
         * @param {Array} constructorArgNatives
         * @return {ObjectValue}
         */
        instantiateObject: function (className, constructorArgNatives) {
            var factory = this,
                constructorArgValues = _.map(constructorArgNatives, function (argNative) {
                    return factory.coerce(argNative);
                });

            return factory.globalNamespace.getClass(className).instantiate(constructorArgValues);
        },

        isValue: function (object) {
            return object instanceof Value;
        },
        /**
         * Allows an unwrapped object to later be mapped back to its original ObjectValue
         * (eg. when passed back to PHP-land from JS-land as a method argument)
         *
         * @param {object} unwrappedObject
         * @param {ObjectValue} objectValue
         */
        mapUnwrappedObjectToValue: function (unwrappedObject, objectValue) {
            var factory = this;

            factory.unwrappedObjectToValueMap.set(unwrappedObject, objectValue);
            factory.valueToUnwrappedObjectMap.set(objectValue, unwrappedObject);
        },
        setGlobalNamespace: function (globalNamespace) {
            this.globalNamespace = globalNamespace;
        }
    });

    return ValueFactory;
}, {strict: true});
