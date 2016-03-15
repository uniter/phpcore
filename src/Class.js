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
    require('./Reference/StaticProperty')
], function (
    _,
    phpCommon,
    StaticPropertyReference
) {
    var IS_STATIC = 'isStatic',
        MAGIC_CALL = '__call',
        VALUE = 'value',
        VISIBILITY = 'visibility',
        hasOwn = {}.hasOwnProperty,
        PHPError = phpCommon.PHPError,
        PHPFatalError = phpCommon.PHPFatalError;

    function Class(
        valueFactory,
        callStack,
        name,
        constructorName,
        InternalClass,
        staticPropertiesData,
        constants,
        superClass,
        interfaceNames,
        namespaceScope
    ) {
        var classObject = this,
            staticProperties = {};

        this.autoCoercionEnabled = false;
        this.callStack = callStack;
        this.constants = constants;
        this.constructorName = constructorName;
        this.interfaceNames = interfaceNames || [];
        this.InternalClass = InternalClass;
        this.name = name;
        this.namespaceScope = namespaceScope;
        this.staticProperties = staticProperties;
        this.superClass = superClass;
        this.unwrapper = null;
        this.valueFactory = valueFactory;

        _.each(staticPropertiesData, function (data, name) {
            staticProperties[name] = new StaticPropertyReference(classObject, name, data[VISIBILITY], data[VALUE]);
        });
    }

    _.extend(Class.prototype, {
        /**
         * Calls a method of an instance of this class
         *
         * @param {object} object The current object on the prototype chain to search for the method
         * @param {string} methodName The name of the method to call
         * @param {Value[]} args The wrapped value objects to pass as arguments to the method
         * @param {object} nativeObject The native JS object for this instance
         * @param {ObjectValue} objectValue The wrapped ObjectValue for this instance
         * @returns {Value}
         * @throws {PHPFatalError} Throws when the method is not defined
         */
        callMethodForInstance: function (object, methodName, args, nativeObject, objectValue) {
            var classObject = this,
                result;

            function unwrapArgs(args) {
                if (classObject.autoCoercionEnabled) {
                    return _.map(args, function (arg) {
                        return arg.getNative();
                    });
                }

                return args;
            }

            function callMethod(currentObject, methodName, args) {
                var result = null;

                _.forOwn(currentObject, function (value, propertyName) {
                    if (
                        propertyName.toLowerCase() === methodName.toLowerCase() &&
                        _.isFunction(value)
                    ) {
                        result = classObject.valueFactory.coerce(
                            value.apply(
                                classObject.autoCoercionEnabled ? nativeObject : objectValue,
                                unwrapArgs(args)
                            )
                        );
                        return false;
                    }
                });

                if (result !== null) {
                    return result;
                }

                if (
                    currentObject === classObject.InternalClass.prototype &&
                    classObject.superClass
                ) {
                    return classObject.superClass.callMethodForInstance(
                        Object.getPrototypeOf(currentObject),
                        methodName,
                        args,
                        nativeObject,
                        objectValue
                    );
                }

                currentObject = Object.getPrototypeOf(currentObject);

                if (!currentObject) {
                    return null;
                }

                return callMethod(currentObject, methodName, args);
            }

            if (nativeObject instanceof classObject.InternalClass) {
                // Ignore own properties of the native object when searching for methods
                if (object === nativeObject) {
                    object = Object.getPrototypeOf(object);
                }

                result = callMethod(object, methodName, args);

                if (result !== null) {
                    return result;
                }

                // Method was not found on object or its prototype chain: try the magic method
                result = callMethod(object, MAGIC_CALL, [
                    classObject.valueFactory.createString(methodName),
                    classObject.valueFactory.createArray(args)
                ]);

                if (result !== null) {
                    return result;
                }
            } else {
                // For some special classes (eg. JSObject, Closure) the native object may not actually
                // be an instance of the InternalClass, so fake inheritance of the native class
                result = callMethod(classObject.InternalClass.prototype, methodName, args);

                if (result !== null) {
                    return result;
                }

                result = callMethod(classObject.InternalClass.prototype, MAGIC_CALL, [
                    classObject.valueFactory.createString(methodName),
                    classObject.valueFactory.createArray(args)
                ]);

                if (result !== null) {
                    return result;
                }
            }

            // Method was not found and no magic __call method is defined
            throw new PHPFatalError(
                PHPFatalError.UNDEFINED_METHOD,
                {
                    className: classObject.name,
                    methodName: methodName
                }
            );
        },

        callStaticMethod: function (name, args) {
            var classObject = this,
                defined = true,
                method,
                prototype = classObject.InternalClass.prototype,
                otherPrototype;

            // Allow methods inherited via the prototype chain up to but not including Object.prototype
            if (!hasOwn.call(prototype, name)) {
                otherPrototype = prototype;

                do {
                    otherPrototype = Object.getPrototypeOf(otherPrototype);
                    if (!otherPrototype || otherPrototype === Object.prototype) {
                        defined = false;
                        break;
                    }
                } while (!hasOwn.call(otherPrototype, name));
            }

            method = prototype[name];

            if (!defined || !_.isFunction(method)) {
                throw new PHPFatalError(PHPFatalError.CALL_TO_UNDEFINED_METHOD, {
                    className: classObject.name,
                    methodName: name
                });
            }

            if (!method[IS_STATIC]) {
                classObject.callStack.raiseError(PHPError.E_STRICT, 'Non-static method ' + method.data.classObject.name + '::' + name + '() should not be called statically');
            }

            return classObject.valueFactory.coerce(method.apply(null, args));
        },

        /**
         * Calls the constructor for the provided object
         *
         * @param {ObjectValue} objectValue
         * @param {Value[]} args
         */
        construct: function (objectValue, args) {
            var classObject = this;

            if (!classObject.constructorName) {
                // Class does not define a constructor: call the superclass' constructor
                // if it has one, otherwise do nothing
                if (classObject.superClass) {
                    classObject.superClass.construct(objectValue, args);
                }

                return;
            }

            objectValue.callMethod(classObject.constructorName, args);
        },

        /**
         * Defines a function suitable for unwrapping instances of this class
         * to be exported to JS-land
         *
         * @param {function} unwrapper
         * @returns {*}
         */
        defineUnwrapper: function (unwrapper) {
            this.unwrapper = unwrapper;
        },

        /**
         * Prevents constructor and method arguments from being unwrapped
         * to native JS values when called
         */
        disableAutoCoercion: function () {
            this.autoCoercionEnabled = false;
        },

        /**
         * Ensures constructor and method arguments are always unwrapped
         * to native JS values when called
         */
        enableAutoCoercion: function () {
            this.autoCoercionEnabled = true;
        },

        extends: function (superClass) {
            var classObject = this;

            return classObject.superClass && (classObject.superClass.name === superClass.name || classObject.superClass.extends(superClass));
        },

        getConstantByName: function self(name) {
            var classObject = this,
                i,
                interfaceObject;

            if (hasOwn.call(classObject.constants, name)) {
                return classObject.constants[name]();
            }

            if (classObject.superClass) {
                return classObject.superClass.getConstantByName(name);
            }

            for (i = 0; i < classObject.interfaceNames.length; i++) {
                interfaceObject = classObject.namespaceScope.getClass(classObject.interfaceNames[i]);

                try {
                    return interfaceObject.getConstantByName(name);
                } catch (e) {
                    console.log('hmm');
                }
            }

            throw new PHPFatalError(PHPFatalError.UNDEFINED_CLASS_CONSTANT, {
                name: name
            });
        },

        getInternalClass: function () {
            return this.InternalClass;
        },

        getName: function () {
            return this.name;
        },

        getUnprefixedName: function () {
            return this.name.replace(/^.*\\/, '');
        },

        getStaticPropertyByName: function (name) {
            var classObject = this,
                currentClass,
                staticProperty;

            if (!hasOwn.call(classObject.staticProperties, name)) {
                throw new PHPFatalError(PHPFatalError.UNDECLARED_STATIC_PROPERTY, {
                    className: classObject.name,
                    propertyName: name
                });
            }

            staticProperty = classObject.staticProperties[name];

            // Property is private; may only be read from methods of this class and not derivatives
            if (staticProperty.getVisibility() === 'private') {
                currentClass = classObject.callStack.getCurrent().getScope().getCurrentClass();

                if (!currentClass || currentClass.name !== classObject.name) {
                    throw new PHPFatalError(PHPFatalError.CANNOT_ACCESS_PROPERTY, {
                        className: classObject.name,
                        propertyName: name,
                        visibility: 'private'
                    });
                }
                // Property is protected; may be read from methods of this class and methods of derivatives
            } else if (staticProperty.getVisibility() === 'protected') {
                currentClass = classObject.callStack.getCurrent().getScope().getCurrentClass();

                if (!currentClass || (classObject.name !== currentClass.name && !currentClass.extends(classObject))) {
                    throw new PHPFatalError(PHPFatalError.CANNOT_ACCESS_PROPERTY, {
                        className: classObject.name,
                        propertyName: name,
                        visibility: 'protected'
                    });
                }
            }

            return staticProperty;
        },

        hasStaticPropertyByName: function (name) {
            return hasOwn.call(this.staticProperties, name);
        },

        /**
         * Creates a new instance of this class
         *
         * @param {Value[]} args
         * @returns {ObjectValue}
         */
        instantiate: function (args) {
            var classObject = this,
                nativeObject = Object.create(classObject.InternalClass.prototype),
                objectValue = classObject.valueFactory.createObject(nativeObject, classObject);

            classObject.InternalClass.apply(
                // Always use the native object as `this` regardless of coercion status,
                // so that new native properties may be added to the object
                nativeObject,
                classObject.autoCoercionEnabled ?
                    _.map(args, function (arg) {
                        return arg.getNative();
                    }) :
                    args
            );

            classObject.construct(objectValue, args);

            return objectValue;
        },

        is: function (className) {
            var classObject = this,
                interfaceMatches = false;

            // Case-insensitively compare the fully-qualified class paths
            if (classObject.name.toLowerCase() === className.toLowerCase()) {
                return true;
            }

            // Iterate over all the interfaces implemented by this class: if any of them
            // are the requested class or extend from it, return true
            _.each(classObject.interfaceNames, function (interfaceName) {
                var interfaceObject = classObject.namespaceScope.getClass(interfaceName);

                if (interfaceObject.is(className)) {
                    interfaceMatches = true;
                    return false;
                }
            });

            if (interfaceMatches) {
                return true;
            }

            if (classObject.superClass) {
                return classObject.superClass.is(className);
            }

            return false;
        },

        /**
         * Returns true if auto-coercion is enabled, and false otherwise.
         * Constructor and method arguments will be unwrapped to native JS values when enabled
         *
         * @returns {boolean}
         */
        isAutoCoercionEnabled: function () {
            return this.autoCoercionEnabled;
        },

        /**
         * Unwraps instances of this class with the defined unwrapper if one has been set,
         * otherwise wraps them in PHPObject
         *
         * @param {ObjectValue} instance
         * @param {object} nativeObject
         * @returns {*|PHPObject}
         */
        unwrapInstanceForJS: function (instance, nativeObject) {
            var classObject = this;

            if (classObject.unwrapper) {
                return classObject.unwrapper.call(nativeObject);
            }

            // Return a wrapper object that presents a promise-based API
            // for calling methods of PHP objects in sync or async mode
            return classObject.valueFactory.createPHPObject(instance);
        }
    });

    return Class;
}, {strict: true});
