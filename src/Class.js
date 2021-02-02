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
    require('./Reference/StaticProperty'),
    require('./Reference/UndeclaredStaticProperty')
], function (
    _,
    phpCommon,
    StaticPropertyReference,
    UndeclaredStaticPropertyReference
) {
    var IS_STATIC = 'isStatic',
        MAGIC_CALL = '__call',
        MAGIC_CALL_STATIC = '__callStatic',

        CANNOT_ACCESS_PROPERTY = 'core.cannot_access_property',
        UNDEFINED_CLASS_CONSTANT = 'core.undefined_class_constant',
        UNDEFINED_METHOD = 'core.undefined_method',

        VALUE = 'value',
        VISIBILITY = 'visibility',
        hasOwn = {}.hasOwnProperty,
        PHPError = phpCommon.PHPError,
        getMethod = function (object, methodName) {
            var result = null;

            _.forOwn(object, function (value, propertyName) {
                if (
                    propertyName.toLowerCase() === methodName.toLowerCase() &&
                    _.isFunction(value)
                ) {
                    result = value;
                    return false;
                }
            });

            return result;
        };

    /**
     * Represents a class exposed to PHP-land
     *
     * @param {ValueFactory} valueFactory
     * @param {FunctionFactory} functionFactory
     * @param {CallStack} callStack
     * @param {string} name Fully-qualified class name (FQCN)
     * @param {string} constructorName
     * @param {Function} InternalClass
     * @param {Object} rootInternalPrototype
     * @param {Object} staticPropertiesData
     * @param {Object.<string, Function>} constants Map of constant names to value factory functions
     * @param {Class|null} superClass Parent class, if any
     * @param {string[]} interfaceNames FQCNs (FQINs) of interfaces implemented by this class
     * @param {NamespaceScope} namespaceScope
     * @param {ExportRepository} exportRepository
     * @param {ValueCoercer} valueCoercer Value coercer configured specifically for this class
     * @param {FFIFactory} ffiFactory
     * @constructor
     */
    function Class(
        valueFactory,
        functionFactory,
        callStack,
        name,
        constructorName,
        InternalClass,
        rootInternalPrototype,
        staticPropertiesData,
        constants,
        superClass,
        interfaceNames,
        namespaceScope,
        exportRepository,
        valueCoercer,
        ffiFactory
    ) {
        var classObject = this,
            staticProperties = {};

        this.callStack = callStack;
        this.constants = constants;
        this.constructorName = constructorName;
        this.exportRepository = exportRepository;
        /**
         * @type {FFIFactory}
         */
        this.ffiFactory = ffiFactory;
        this.functionFactory = functionFactory;
        this.interfaceNames = interfaceNames || [];
        this.InternalClass = InternalClass;
        this.name = name;
        this.namespaceScope = namespaceScope;
        // The prototype object that we should stop at when walking up the chain
        this.rootInternalPrototype = rootInternalPrototype;
        this.staticProperties = staticProperties;
        this.superClass = superClass || null;
        /**
         * @type {ValueCoercer}
         */
        this.valueCoercer = valueCoercer;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;

        _.each(staticPropertiesData, function (data, name) {
            // Pass the class object to the property initialiser (if any),
            // so that it may refer to other properties/constants of this class with self::*
            staticProperties[name] = new StaticPropertyReference(
                valueFactory,
                callStack,
                classObject,
                name,
                data[VISIBILITY],
                data[VALUE](classObject)
            );
        });
    }

    _.extend(Class.prototype, {
        /**
         * Calls an instance or static method. If `objectValue` is passed, the call
         * will be in an object context, otherwise it will be in a static context.
         *
         * Omit both `objectValue` and `currentNativeObject` for a static call.
         *
         * @param {string} methodName The name of the method to call
         * @param {Value[]} args The wrapped value objects to pass as arguments to the method
         * @param {ObjectValue|null} objectValue The wrapped ObjectValue for this instance
         * @param {object|null} currentNativeObject The current native JS object on the prototype chain to search for the method
         * @param {Class|null} currentClass The original called class (this function is called recursively for inherited methods)
         * @param {bool} isForwardingStaticCall eg. self::f() is forwarding, MyParentClass::f() is non-forwarding
         * @returns {Value} Returns the result of the method if it is defined
         * @throws {PHPFatalError} Throws when the method is not defined
         */
        callMethod: function (methodName, args, objectValue, currentNativeObject, currentClass, isForwardingStaticCall) {
            var classObject = this,
                nativeObject = objectValue ? objectValue.getObject() : null,
                result,
                thisObject = classObject.callStack.getThisObject();

            function callMethod(currentObject, methodName, args) {
                var method = getMethod(currentObject, methodName);

                if (method !== null) {
                    if (!objectValue && !method[IS_STATIC]) {
                        objectValue = thisObject;

                        if (!objectValue) {
                            // TODO: Change for PHP 7 (see https://www.php.net/manual/en/migration70.incompatible.php)
                            classObject.callStack.raiseError(
                                PHPError.E_STRICT,
                                'Non-static method ' + method.data.classObject.name +
                                '::' + methodName + '() should not be called statically'
                            );
                        } else if (!objectValue.classIs(classObject.getName())) {
                            // TODO: Change for PHP 7 (see https://www.php.net/manual/en/migration70.incompatible.php)
                            classObject.callStack.raiseError(
                                PHPError.E_STRICT,
                                'Non-static method ' + method.data.classObject.name +
                                '::' + methodName + '() should not be called statically, ' +
                                'assuming $this from incompatible context'
                            );
                        }
                    }

                    // For a non-forwarding static call, pass the new static class through.
                    // (For a forwarding static call, we will pass `null` through as the "new static class"
                    // inside FunctionFactory, because we just want to use the one the caller has.)
                    if (!isForwardingStaticCall) {
                        classObject.functionFactory.setNewStaticClassIfWrapped(method, currentClass);
                    }

                    return classObject.valueFactory.coerce(
                        method.apply(
                            // Some methods should never have their `this` object and args auto-coerced,
                            // eg the magic `__construct` method as it is proxied in Namespace.js
                            classObject.valueCoercer.isAutoCoercionEnabled() && !method.neverCoerce ?
                                objectValue.getObject() :
                                objectValue,
                            method.neverCoerce ? args : classObject.valueCoercer.coerceArguments(args)
                        )
                    );
                }

                if (
                    currentObject === classObject.rootInternalPrototype &&
                    classObject.superClass
                ) {
                    return classObject.superClass.callMethod(
                        methodName,
                        args,
                        objectValue,
                        Object.getPrototypeOf(currentObject),
                        currentClass,
                        isForwardingStaticCall
                    );
                }

                currentObject = Object.getPrototypeOf(currentObject);

                if (!currentObject) {
                    return null;
                }

                return callMethod(currentObject, methodName, args);
            }

            isForwardingStaticCall = !!isForwardingStaticCall;

            if (!currentNativeObject) {
                // Walk up the prototype chain from the native object
                currentNativeObject = nativeObject;
            }

            if (!currentClass) {
                currentClass = classObject;
            }

            if (nativeObject instanceof classObject.InternalClass) {
                // Ignore own properties of the native object when searching for methods
                if (currentNativeObject === nativeObject) {
                    currentNativeObject = Object.getPrototypeOf(currentNativeObject);
                }
            } else {
                // For some special classes (eg. JSObject, Closure) the native object may not actually
                // be an instance of the InternalClass, so fake inheritance of the native class
                currentNativeObject = classObject.InternalClass.prototype;
            }

            result = callMethod(currentNativeObject, methodName, args);

            if (result !== null) {
                return result;
            }

            // Method was not found on object or its prototype chain: try the magic method(s)

            if (!objectValue && thisObject) {
                // Magic __call(...) should override __callStatic(...)
                // when both present for static call in object context
                result = callMethod(thisObject.getObject(), MAGIC_CALL, [
                    classObject.valueFactory.createString(methodName),
                    classObject.valueFactory.createArray(args)
                ]);

                if (result !== null) {
                    return result;
                }
            }

            result = callMethod(
                currentNativeObject,
                objectValue ? MAGIC_CALL : MAGIC_CALL_STATIC,
                [
                    classObject.valueFactory.createString(methodName),
                    classObject.valueFactory.createArray(args)
                ]
            );

            if (result !== null) {
                return result;
            }

            // Method was not found and no magic __call method is defined
            classObject.callStack.raiseTranslatedError(PHPError.E_ERROR, UNDEFINED_METHOD, {
                className: classObject.name,
                methodName: methodName
            });
        },

        /**
         * Calls the userland constructor for the provided object
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

            // Call the constructor for the current class and not via the object value,
            // as the method may have been overridden by descendant classes
            classObject.callMethod(classObject.constructorName, args, objectValue);
        },

        /**
         * Exports instances of this class with a defined unwrapper if one has been set,
         * otherwise wraps them in a native JS class that extends the PHP class' internal class
         *
         * @param {ObjectValue} objectValue
         * @returns {Object}
         */
        exportInstanceForJS: function (objectValue) {
            return this.exportRepository.export(objectValue);
        },

        /**
         * Determines whether this class extends the given other class
         *
         * @param {Class} superClass
         * @returns {boolean}
         */
        extends: function (superClass) {
            var classObject = this;

            return classObject.superClass && (classObject.superClass.name === superClass.name || classObject.superClass.extends(superClass));
        },

        /**
         * Fetches the value of a constant of this class. Constants may be defined by the current class,
         * an ancestor or by an interface implemented by this class or an ancestor
         *
         * @param {string} name
         * @returns {Value}
         */
        getConstantByName: function (name) {
            var classObject = this,
                i,
                interfaceObject;

            if (name.toLowerCase() === 'class') {
                // The special MyClass::class constant that fetches the FQCN of the class as a string
                return classObject.valueFactory.createString(classObject.getName());
            }

            if (hasOwn.call(classObject.constants, name)) {
                return classObject.constants[name]();
            }

            for (i = 0; i < classObject.interfaceNames.length; i++) {
                interfaceObject = classObject.namespaceScope.getClass(classObject.interfaceNames[i]);

                try {
                    return interfaceObject.getConstantByName(name);
                } catch (e) {
                    // Not found, try the next interface
                }
            }

            if (classObject.superClass) {
                return classObject.superClass.getConstantByName(name);
            }

            classObject.callStack.raiseTranslatedError(PHPError.E_ERROR, UNDEFINED_CLASS_CONSTANT, {
                name: name
            });
        },

        getInternalClass: function () {
            return this.InternalClass;
        },

        /**
         * Fetches the spec for an instance or static method
         *
         * @param {string} methodName The name of the method to fetch the spec for
         * @param {ObjectValue=null} objectValue The wrapped ObjectValue for this instance
         * @param {object=null} currentNativeObject The current native JS object on the prototype chain to search for the method
         * @param {Class=null} originalClass The original class (this function is called recursively for inherited methods)
         * @returns {MethodSpec|null} Returns the spec of the method if it exists, or null if it does not
         */
        getMethodSpec: function (methodName, objectValue, currentNativeObject, originalClass) {
            var classObject = this,
                nativeObject = objectValue ? objectValue.getObject() : null;

            function getMethodSpec(currentObject, methodName) {
                var method = getMethod(currentObject, methodName);

                if (method !== null) {
                    return classObject.functionFactory.createMethodSpec(originalClass, classObject, methodName, method);
                }

                if (
                    currentObject === classObject.rootInternalPrototype &&
                    classObject.superClass
                ) {
                    return classObject.superClass.getMethodSpec(
                        methodName,
                        objectValue,
                        Object.getPrototypeOf(currentObject),
                        originalClass
                    );
                }

                currentObject = Object.getPrototypeOf(currentObject);

                if (!currentObject) {
                    return null;
                }

                return getMethodSpec(currentObject, methodName);
            }

            if (!currentNativeObject) {
                // Walk up the prototype chain from the native object
                currentNativeObject = nativeObject;
            }

            if (!originalClass) {
                originalClass = classObject;
            }

            if (nativeObject instanceof classObject.InternalClass) {
                // Ignore own properties of the native object when searching for methods
                if (currentNativeObject === nativeObject) {
                    currentNativeObject = Object.getPrototypeOf(currentNativeObject);
                }
            } else {
                // For some special classes (eg. JSObject, Closure) the native object may not actually
                // be an instance of the InternalClass, so fake inheritance of the native class
                currentNativeObject = classObject.InternalClass.prototype;
            }

            return getMethodSpec(currentNativeObject, methodName);
        },

        /**
         * Fetches the FQCN (Fully-Qualified Class Name) of this class.
         * If the namespace prefix is not wanted, see .getUnprefixedName()
         *
         * @returns {string}
         */
        getName: function () {
            return this.name;
        },

        /**
         * Fetches the name of this class with any namespace prefix removed,
         * eg.:
         *     class with FQCN: My\Stuff\AwesomeClass
         *     unprefixed name: AwesomeClass
         *
         * @returns {string}
         */
        getUnprefixedName: function () {
            return this.name.replace(/^.*\\/, '');
        },

        /**
         * Fetches a reference to a static property of this class by its name
         *
         * @param {string} name
         * @param {Class=} calledClass
         * @returns {StaticPropertyReference|UndeclaredStaticPropertyReference}
         */
        getStaticPropertyByName: function (name, calledClass) {
            var callingClass,
                classObject = this,
                staticProperty;

            // The class that the static property was originally dereferenced for:
            // if we've walked up the class hierarchy to find its definition,
            // this will refer to the class that was actually specified to the left of the `::`
            calledClass = calledClass || classObject;

            if (!hasOwn.call(classObject.staticProperties, name)) {
                if (classObject.superClass) {
                    // Inherit static properties from the parent class, if we extend one
                    return classObject.superClass.getStaticPropertyByName(name, calledClass);
                }

                // Undeclared static properties cannot be accessed _except_ by isset(...) or empty(...),
                // which return the relevant boolean result (`false` and `true` respectively)
                return new UndeclaredStaticPropertyReference(
                    classObject.valueFactory,
                    classObject.callStack,
                    classObject,
                    name
                );
            }

            staticProperty = classObject.staticProperties[name];

            // Property is private; may only be read from methods of this class and not derivatives
            if (staticProperty.getVisibility() === 'private') {
                callingClass = classObject.callStack.getCurrentClass();

                if (!callingClass || callingClass.name !== classObject.name) {
                    classObject.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_ACCESS_PROPERTY, {
                        className: calledClass.getName(),
                        propertyName: name,
                        visibility: 'private'
                    });
                }
            // Property is protected; may be read from methods of this class and methods of derivatives
            } else if (staticProperty.getVisibility() === 'protected') {
                callingClass = classObject.callStack.getCurrentClass();

                if (
                    !callingClass ||
                    (
                        classObject.getName() !== callingClass.getName() &&
                        !callingClass.isInFamilyOf(classObject)
                    )
                ) {
                    classObject.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_ACCESS_PROPERTY, {
                        className: classObject.name,
                        propertyName: name,
                        visibility: 'protected'
                    });
                }
            }

            return staticProperty;
        },

        /**
         * Fetches the parent class of this one, or null if it has no parent
         *
         * @returns {Class|null}
         */
        getSuperClass: function () {
            return this.superClass;
        },

        hasStaticPropertyByName: function (name) {
            return hasOwn.call(this.staticProperties, name);
        },

        /**
         * Fetches all interfaces directly implemented by this class
         *
         * @returns {Class[]}
         */
        getInterfaces: function () {
            var classObject = this;

            return classObject.interfaceNames.map(function (interfaceName) {
                return classObject.namespaceScope.getClass(interfaceName);
            });
        },

        /**
         * Returns either the given ObjectValue or its inner native object, based on the class' auto-coercion mode
         *
         * @param {ObjectValue} instance
         * @returns {ObjectValue|Object}
         */
        getThisObjectForInstance: function (instance) {
            return this.valueCoercer.isAutoCoercionEnabled() ? instance.getObject() : instance;
        },

        /**
         * Creates a new instance of this class
         *
         * @param {Value[]=} args
         * @returns {ObjectValue}
         */
        instantiate: function (args) {
            var classObject = this,
                objectValue;

            if (!args) {
                args = [];
            }

            objectValue = classObject.instantiateBare(args);

            // Call the userland constructor
            classObject.construct(objectValue, args);

            return objectValue;
        },

        /**
         * Creates a new instance of this class without calling any userland constructor
         * (note that for JS classes the class-constructor-function will still be called)
         *
         * @param {Value[]=} args
         * @returns {ObjectValue}
         */
        instantiateBare: function (args) {
            var classObject = this,
                nativeObject = Object.create(classObject.InternalClass.prototype),
                objectValue = classObject.valueFactory.createObject(nativeObject, classObject);

            if (!args) {
                args = [];
            }

            classObject.InternalClass.apply(
                // Always use the wrapped object value as `this` regardless of coercion status,
                // so that non-native properties/methods may be accessed
                objectValue,
                classObject.valueCoercer.coerceArguments(args)
            );

            return objectValue;
        },

        /**
         * Creates a new instance of this class and also sets the given internal properties (shorthand)
         *
         * @param {Value[]} args
         * @param {Object.<string, *>} internals
         * @return {ObjectValue}
         */
        instantiateWithInternals: function (args, internals) {
            var classObject = this,
                objectValue = classObject.instantiate(args);

            _.forOwn(internals, function (value, name) {
                objectValue.setInternalProperty(name, value);
            });

            return objectValue;
        },

        /**
         * Determines whether:
         * - This class' FQCN is the same as the one given, or
         * - This class implements an interface with the name given, or
         * - This class has an ancestor with the name given
         *
         * @param {Class} className
         * @returns {boolean}
         */
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
         * Determines whether this class is identical to or is an ancestor or descendant
         * of the specified other class
         *
         * @param {Class} otherClass
         * @returns {boolean}
         */
        isInFamilyOf: function (otherClass) {
            var classObject = this;

            return classObject === otherClass ||
                classObject.extends(otherClass) ||
                otherClass.extends(classObject);
        },

        /**
         * Returns true if auto-coercion is enabled, and false otherwise.
         * Constructor and method arguments will be unwrapped to native JS values when enabled
         *
         * @returns {boolean}
         */
        isAutoCoercionEnabled: function () {
            return this.valueCoercer.isAutoCoercionEnabled();
        },

        /**
         * Wraps instances of this class in instances of the proxying PHPObject class
         *
         * @param {ObjectValue} instance
         * @returns {PHPObject}
         */
        proxyInstanceForJS: function (instance) {
            var classObject = this;

            // Return a wrapper object that presents a promise-based API
            // for calling methods of PHP objects in sync or async mode
            return classObject.ffiFactory.createPHPObject(instance);
        },

        /**
         * Unwraps arguments for a method based on the coercion & prefer-sync modes for the class
         *
         * @param {Value[]} argumentValues
         * @returns {Value[]|*[]}
         */
        unwrapArguments: function (argumentValues) {
            return this.valueCoercer.coerceArguments(argumentValues);
        }
    });

    return Class;
}, {strict: true});
