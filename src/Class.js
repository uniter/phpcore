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
    require('es6-weak-map')
], function (
    _,
    phpCommon,
    WeakMap
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
        Exception = phpCommon.Exception,
        PHPError = phpCommon.PHPError,
        methodLookupMap = new WeakMap(),
        /**
         * Fetches a method from the specified object
         *
         * TODO: Build method map when class is initialised rather than resolving at runtime like this
         *
         * @param {Object} object
         * @param {string} methodName
         * @returns {Function|null}
         */
        getMethod = function (object, methodName) {
            var methods;

            if (methodLookupMap.has(object)) {
                methods = methodLookupMap.get(object);
            } else {
                methods = Object.create(null);

                _.forOwn(object, function (value, propertyName) {
                    if (_.isFunction(value)) {
                        methods[propertyName.toLowerCase()] = value;
                    }
                });

                methodLookupMap.set(object, methods);
            }

            return methods[methodName.toLowerCase()] || null;
        };

    /**
     * Represents a class exposed to PHP-land
     *
     * @param {ValueFactory} valueFactory
     * @param {ValueProvider} valueProvider
     * @param {ReferenceFactory} referenceFactory
     * @param {FunctionFactory} functionFactory
     * @param {CallStack} callStack
     * @param {Flow} flow
     * @param {FutureFactory} futureFactory
     * @param {Userland} userland
     * @param {string} name Fully-qualified class name (FQCN)
     * @param {string|null} constructorName
     * @param {boolean} hasDestructor
     * @param {Function} InternalClass
     * @param {Object} rootInternalPrototype
     * @param {Object} instancePropertiesData
     * @param {Object} staticPropertiesData
     * @param {Object.<string, Function>} constantToProviderMap Map of constant names to value provider functions
     * @param {Class|null} superClass Parent class, if any
     * @param {Class[]} interfaces Interfaces implemented by this class
     * @param {NamespaceScope} namespaceScope
     * @param {ExportRepository} exportRepository
     * @param {ValueCoercer} valueCoercer Value coercer configured specifically for this class
     * @param {FFIFactory} ffiFactory
     * @param {Function|null} methodCaller Custom method call handler
     * @param {CallInstrumentation} instrumentation
     * @param {DestructibleObjectRepository} destructibleObjectRepository
     * @constructor
     */
    function Class(
        valueFactory,
        valueProvider,
        referenceFactory,
        functionFactory,
        callStack,
        flow,
        futureFactory,
        userland,
        name,
        constructorName,
        hasDestructor,
        InternalClass,
        rootInternalPrototype,
        instancePropertiesData,
        staticPropertiesData,
        constantToProviderMap,
        superClass,
        interfaces,
        namespaceScope,
        exportRepository,
        valueCoercer,
        ffiFactory,
        methodCaller,
        instrumentation,
        destructibleObjectRepository
    ) {
        var classObject = this,
            staticProperties = {};

        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {Object<string, Function>}
         */
        this.constantToProviderMap = constantToProviderMap;
        /**
         * @type {boolean}
         */
        this.constantsInitialised = false;
        /**
         * Cache of the lazily-evaluated values of this class' constants.
         *
         * @type {Object.<string, Value>}
         */
        this.constantValues = {};
        /**
         * @type {string|null}
         */
        this.constructorName = constructorName;
        /**
         * @type {ExportRepository}
         */
        this.exportRepository = exportRepository;
        /**
         * @type {FFIFactory}
         */
        this.ffiFactory = ffiFactory;
        /**
         * @type {Flow}
         */
        this.flow = flow;
        /**
         * @type {FunctionFactory}
         */
        this.functionFactory = functionFactory;
        /**
         * @type {FutureFactory}
         */
        this.futureFactory = futureFactory;
        /**
         * @type {Object}
         */
        this.instancePropertiesData = instancePropertiesData;
        /**
         * See .initialiseInstancePropertyDefaults() for initialisation logic.
         *
         * @type {Object.<string, Value>}
         */
        this.instancePropertyDefaults = {};
        /**
         * @type {boolean}
         */
        this.instancePropertyDefaultsInitialised = false;
        /**
         * @type {CallInstrumentation}
         */
        this.instrumentation = instrumentation;
        /**
         * @type {Class[]}
         */
        this.interfaces = interfaces;
        /**
         * @type {Function}
         */
        this.InternalClass = InternalClass;
        /**
         * @type {Function|null}
         */
        this.methodCaller = methodCaller;
        /**
         * Looked up method specs, indexed by lowercase name to handle case-insensitivity
         *
         * @type {Object.<string, MethodSpec>}
         */
        this.methodSpecCache = Object.create(null);
        /**
         * @type {string}
         */
        this.name = name;
        /**
         * @type {NamespaceScope}
         */
        this.namespaceScope = namespaceScope;
        /**
         * @type {ReferenceFactory}
         */
        this.referenceFactory = referenceFactory;
        /**
         * The prototype object that we should stop at when walking up the chain
         *
         * @type {Object}
         */
        this.rootInternalPrototype = rootInternalPrototype;
        /**
         * See below for creation logic, and .initialiseStaticProperties() for initialisation logic
         *
         * @type {Object.<string, StaticPropertyReference>}
         */
        this.staticProperties = staticProperties;
        /**
         * @type {Object}
         */
        this.staticPropertiesData = staticPropertiesData;
        /**
         * @type {boolean}
         */
        this.staticPropertiesInitialised = false;
        /**
         * @type {Class|null}
         */
        this.superClass = superClass || null;
        /**
         * @type {Userland}
         */
        this.userland = userland;
        /**
         * @type {ValueCoercer}
         */
        this.valueCoercer = valueCoercer;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
        /**
         * @type {ValueProvider}
         */
        this.valueProvider = valueProvider;

        // Create static properties: note that values are initialised lazily,
        // see .initialiseStaticProperties()
        _.each(staticPropertiesData, function (data, name) {
            staticProperties[name] = referenceFactory.createStaticProperty(
                name,
                classObject,
                data[VISIBILITY]
            );
        });

        /**
         * @type {Function}
         */
        this.internalInstantiator = hasDestructor ?
            function (objectValue) {
                destructibleObjectRepository.registerValue(objectValue);
            } :
            function () {
                // No destructor defined, nothing special to do.
            };
    }

    _.extend(Class.prototype, {
        /**
         * Calls an instance or static method. If `objectValue` is passed, the call
         * will be in an object context, otherwise it will be in a static context.
         *
         * Omit both `objectValue` and `currentNativeObject` for a static call.
         *
         * @param {string} methodName The name of the method to call
         * @param {Reference[]|Value[]} args The wrapped value objects or references to pass as arguments to the method
         * @param {ObjectValue|null} objectValue The wrapped ObjectValue for this instance
         * @param {object|null} currentNativeObject The current native JS object on the prototype chain to search for the method
         * @param {Class|null} currentClass The original called class (this function is called recursively for inherited methods)
         * @param {bool} isForwardingStaticCall eg. self::f() is forwarding, MyParentClass::f() is non-forwarding
         * @returns {ChainableInterface<Reference|Value|Variable>} Returns the result of the method if it is defined
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

                    /*
                     * Method may return a Value, Future-wrapped Reference or Variable etc.
                     * If the method returns undefined (eg. userland and there was no return statement)
                     * then the wrapper from FunctionFactory will ensure it is coerced to a NullValue for example.
                     */
                    return method.apply(objectValue, args);
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

            if (classObject.methodCaller) {
                // A custom method caller/accelerator is installed, call it directly instead.
                // Used by e.g. JSObject to avoid additional magic method calls per native call.
                return classObject.valueProvider.createFutureList(args)
                    .next(function (presentArgs) {
                        return classObject.methodCaller.call(
                            objectValue,
                            methodName,
                            /*
                             * Arguments will have been resolved to present Value objects by this point.
                             * Note that this prevents by-reference parameters, but those are not supported
                             * natively by JavaScript anyway.
                             */
                            presentArgs
                        );
                    })
                    // Note this will mean a Variable or Reference cannot be returned from the method caller.
                    .asValue();
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

            /*
             * Method was not found on object or its prototype chain: try the magic method(s).
             *
             * Resolve all arguments (references or values) to present values and wrap them in an ArrayValue
             * so that we can pass it in as the second argument to the magic method.
             */
            return classObject.valueProvider.createFutureArray(args)
                .next(function (argsArray) {
                    if (!objectValue && thisObject) {
                        // Magic __call(...) should override __callStatic(...)
                        // when both are present for static call in object context.
                        result = callMethod(thisObject.getObject(), MAGIC_CALL, [
                            classObject.valueFactory.createString(methodName),
                            argsArray
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
                            argsArray
                        ]
                    );

                    if (result !== null) {
                        return result;
                    }

                    // Method was not found and no magic __call(Static) method is defined.
                    classObject.callStack.raiseTranslatedError(PHPError.E_ERROR, UNDEFINED_METHOD, {
                        className: classObject.name,
                        methodName: methodName
                    });
                });
        },

        /**
         * Calls the userland constructor for the provided object.
         *
         * @param {ObjectValue} objectValue
         * @param {Value[]} args
         * @returns {ChainableInterface<ObjectValue>}
         */
        construct: function (objectValue, args) {
            var classObject = this;

            if (!classObject.constructorName) {
                // Class does not define a constructor: call the superclass' constructor
                // if it has one, otherwise do nothing.
                if (classObject.superClass) {
                    // Note that this may return a Future if the constructor paused.
                    return classObject.superClass.construct(objectValue, args);
                }

                return objectValue;
            }

            // Call the constructor for the current class and not via the object value,
            // as the method may have been overridden by descendant classes.
            return classObject.callMethod(classObject.constructorName, args, objectValue)
                /*
                 * Discard the result value of the constructor method and return the new ObjectValue.
                 * Note that if a pause occurs inside the constructor, a Future will
                 * be returned.
                 */
                .next(function () {
                    return objectValue;
                });
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
         * an ancestor or by an interface implemented by this class or an ancestor.
         *
         * @param {string} name
         * @returns {ChainableInterface<Value>}
         */
        getConstantByName: function (name) {
            var classObject = this,
                getValue = function () {
                    var value = null;

                    if (hasOwn.call(classObject.constantValues, name)) {
                        // Constant has already been initialised; just return its value.
                        return classObject.constantValues[name];
                    }

                    if (name.toLowerCase() === 'class') {
                        // The special MyClass::class constant that fetches the FQCN of the class as a string.
                        // Note that this constant is case-insensitive while all others are not.
                        return classObject.valueFactory.createString(classObject.getName());
                    }

                    if (hasOwn.call(classObject.constantToProviderMap, name)) {
                        // Allow for the constant value to be loaded asynchronously,
                        // eg. if it references a constant of a different, asynchronously autoloaded class
                        return classObject.userland.enterIsolated(
                            function () {
                                return classObject.constantToProviderMap[name](classObject);
                            },
                            classObject.namespaceScope,
                            classObject.instrumentation
                        );
                    }

                    return classObject.flow.eachAsync(classObject.interfaces, function (interfaceObject) {
                        // Note that this lookup may asynchronously raise an error if the constant is not defined
                        return interfaceObject.getConstantByName(name)
                            .next(function (constantValue) {
                                value = constantValue;

                                // Found, stop iterating
                                return false;
                            }, function () {
                                // Not found, try the next interface
                            });
                    })
                        .next(function () {
                            if (value !== null) {
                                // Constant was defined by an interface of this class
                                return value;
                            }

                            if (classObject.superClass) {
                                return classObject.superClass.getConstantByName(name);
                            }

                            classObject.callStack.raiseTranslatedError(PHPError.E_ERROR, UNDEFINED_CLASS_CONSTANT, {
                                name: name
                            });
                        });
                };

            return getValue().next(function (constantValue) {
                classObject.constantValues[name] = constantValue;

                return constantValue;
            });
        },

        /**
         * Fetches the internal native JS class for this class exposed to PHP
         *
         * @returns {Function}
         */
        getInternalClass: function () {
            return this.InternalClass;
        },

        /**
         * Fetches the spec for an instance or static method
         *
         * TODO: Merge/replace MethodSpec with FunctionSpec/MethodContext etc.?
         *
         * @param {string} methodName The name of the method to fetch the spec for
         * @param {ObjectValue=null} objectValue The wrapped ObjectValue for this instance
         * @param {object=null} currentNativeObject The current native JS object on the prototype chain to search for the method
         * @param {Class=null} originalClass The original class (this function is called recursively for inherited methods)
         * @returns {MethodSpec|null} Returns the spec of the method if it exists, or null if it does not
         */
        getMethodSpec: function (methodName, objectValue, currentNativeObject, originalClass) {
            var classObject = this,
                lowercaseMethodName = methodName.toLowerCase(),
                methodSpec,
                nativeObject;

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

            // Fetch spec from cache if possible
            if (classObject.methodSpecCache[lowercaseMethodName]) {
                return classObject.methodSpecCache[lowercaseMethodName];
            }

            nativeObject = objectValue ? objectValue.getObject() : null;

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

            methodSpec = getMethodSpec(currentNativeObject, methodName);

            // Cache the spec for speed next time
            classObject.methodSpecCache[lowercaseMethodName] = methodSpec;

            return methodSpec;
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
         * Fetches a reference to a static property of this class by its name.
         * Note that static properties are initialised lazily (not until they are required),
         * and when any static property is fetched,
         * all will be initialised at that point if not already done.
         *
         * @param {string} name
         * @param {Class=} calledClass
         * @returns {ChainableInterface<StaticPropertyReference|UndeclaredStaticPropertyReference>}
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
                return classObject.futureFactory.createPresent(
                    classObject.referenceFactory.createUndeclaredStaticProperty(
                        name,
                        classObject
                    )
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

            // Lazily initialise _all_ static properties if needed before returning this one
            return classObject.initialiseStaticProperties().next(function () {
                return staticProperty;
            });
        },

        /**
         * Fetches the parent class of this one, or null if it has no parent
         *
         * @returns {Class|null}
         */
        getSuperClass: function () {
            return this.superClass;
        },

        /**
         * Determines whether this class defines a static property with the given name
         *
         * @param {string} name
         * @returns {boolean}
         */
        hasStaticPropertyByName: function (name) {
            return hasOwn.call(this.staticProperties, name);
        },

        /**
         * Fetches all interfaces directly implemented by this class
         *
         * @returns {Class[]}
         */
        getInterfaces: function () {
            return this.interfaces;
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
         * Initialises all constants of the class that have not yet been initialised.
         *
         * @returns {Future}
         */
        initialiseConstants: function () {
            var classObject = this;

            if (classObject.constantsInitialised) {
                return classObject.futureFactory.createPresent();
            }

            return classObject.flow.eachAsync(
                Object.keys(classObject.constantToProviderMap),
                function (name) {
                    // Note that this could return a Future, e.g. if the constant references
                    // a class that needs to be autoloaded asynchronously.
                    return classObject.getConstantByName(name);
                }
            ).next(function () {
                classObject.constantsInitialised = true;
            });
        },

        /**
         * Initialises defaults for all instance properties of the class if not already done.
         *
         * Note that the defaults are then used to synchronously provide the initial values
         * (after .getForAssignment()) for all instance properties, see .initialiseInstanceProperties().
         *
         * @returns {Future}
         */
        initialiseInstancePropertyDefaults: function () {
            var classObject = this,
                future = classObject.futureFactory.createPresent();

            if (classObject.instancePropertyDefaultsInitialised) {
                // No need to initialise a second time.
                return future;
            }

            if (classObject.superClass) {
                // Ensure all ancestors have been initialised first.
                future = future.next(function () {
                    return classObject.superClass.initialiseInstancePropertyDefaults();
                });
            }

            // Go through and define the properties and their default values
            // on the object from the class definition by initialising them.
            future = future.next(function () {
                return classObject.flow.eachAsync(
                    Object.keys(classObject.instancePropertiesData),
                    function (propertyName) {
                        var data = classObject.instancePropertiesData[propertyName];

                        // Allow for the initial value to be loaded asynchronously,
                        // eg. if it references a constant of a different, asynchronously autoloaded class.
                        return classObject.userland.enterIsolated(
                            function () {
                                // Pass the class object to the property initialiser (if any),
                                // so that it may refer to other properties/constants of this class with self::*
                                return data[VALUE](classObject);
                            },
                            classObject.namespaceScope,
                            classObject.instrumentation
                        ).next(function (initialValue) {
                            if (initialValue === null) {
                                // If a property has no initialiser then its initial value is NULL
                                initialValue = classObject.valueFactory.createNull();
                            }

                            classObject.instancePropertyDefaults[propertyName] = initialValue;
                        });
                    }
                );
            });

            future = future.next(function () {
                classObject.instancePropertyDefaultsInitialised = true;
            });

            return future;
        },

        /**
         * Initialises all static properties for the class if not already done.
         *
         * @returns {Future}
         */
        initialiseStaticProperties: function () {
            var classObject = this;

            if (classObject.staticPropertiesInitialised) {
                // No need to initialise a second time
                return classObject.futureFactory.createPresent();
            }

            /*
             * Static properties have not yet been initialised, do it now.
             * Note that the initialisation may be asynchronous and need to block,
             * eg. if the default value refers to a constant of a class not yet autoloaded
             */

            return classObject.flow.eachAsync(
                Object.keys(classObject.staticPropertiesData),
                function (propertyName) {
                    var data = classObject.staticPropertiesData[propertyName];

                    // Allow for the initial value to be loaded asynchronously,
                    // eg. if it references a constant of a different, asynchronously autoloaded class
                    return classObject.userland.enterIsolated(
                        function () {
                            // Pass the class object to the property initialiser (if any),
                            // so that it may refer to other properties/constants of this class with self::*
                            return data[VALUE](classObject);
                        },
                        classObject.namespaceScope,
                        classObject.instrumentation
                    ).next(function (initialValue) {
                        if (initialValue === null) {
                            // If a property has no initialiser then its initial value is NULL
                            initialValue = classObject.valueFactory.createNull();
                        }

                        return classObject.staticProperties[propertyName].setValue(initialValue);
                    });
                }
            ).next(function () {
                classObject.staticPropertiesInitialised = true;
            });
        },

        /**
         * Creates a new instance of this class.
         *
         * @param {Value[]=} constructorArgs
         * @param {*[]=} shadowConstructorArgs
         * @returns {ChainableInterface<ObjectValue>}
         */
        instantiate: function (constructorArgs, shadowConstructorArgs) {
            var classObject = this;

            if (!constructorArgs) {
                constructorArgs = [];
            }

            return classObject.initialiseConstants()
                .next(function () {
                    return classObject.initialiseStaticProperties();
                })
                .next(function () {
                    return classObject.initialiseInstancePropertyDefaults();
                })
                .next(function () {
                    var objectValue = classObject.instantiateBare(shadowConstructorArgs);

                    // Call the userland constructor. Note that the return value of .construct(...)
                    // may in fact be a Future if there was a pause inside the userland __construct()or.
                    return classObject.construct(objectValue, constructorArgs);
                });
        },

        /**
         * Creates a new instance of this class without calling any userland constructor
         * (note that for JS classes the class-constructor-function will still be called)
         *
         * @param {*[]=} shadowConstructorArgs
         * @returns {ObjectValue}
         */
        instantiateBare: function (shadowConstructorArgs) {
            var classObject = this,
                nativeObject = Object.create(classObject.InternalClass.prototype),
                objectValue = classObject.valueFactory.createObject(nativeObject, classObject);

            classObject.internalConstruct(objectValue, shadowConstructorArgs);

            return objectValue;
        },

        /**
         * Creates a new instance of this class and also sets the given internal properties (shorthand).
         *
         * @param {Value[]} args
         * @param {Object.<string, *>} internals
         * @return {ChainableInterface<ObjectValue>}
         */
        instantiateWithInternals: function (args, internals) {
            var classObject = this;

            return classObject.instantiate(args).next(function (objectValue) {
                _.forOwn(internals, function (value, name) {
                    objectValue.setInternalProperty(name, value);
                });

                return objectValue;
            });
        },

        /**
         * Performs internal construction for an ObjectValue instance of this class:
         *
         * - Calls the internal constructor
         * - Initialises instance properties from defaults.
         *
         * @param {ObjectValue} objectValue
         * @param {*[]=} shadowConstructorArgs
         */
        internalConstruct: function (objectValue, shadowConstructorArgs) {
            var classObject = this,
                properties = {};

            if (!classObject.instancePropertyDefaultsInitialised) {
                throw new Exception('Instance property defaults have not been initialised');
            }

            // Go through and declare the properties on the object from the class definition.
            _.forOwn(classObject.instancePropertiesData, function (propertyData, name) {
                properties[name] = objectValue.declareProperty(name, classObject, propertyData.visibility);
            });

            if (classObject.superClass) {
                // Class has a parent, perform internal construction for it.
                classObject.superClass.internalConstruct(objectValue, shadowConstructorArgs);
            }

            /*
             * Note that interfaces do not have .internalConstruct(...) called on them,
             * so any shadow constructors defined on them will never be called.
             *
             * TODO: Handle shadow constructors via a new Interface class.
             */

            classObject.InternalClass.apply(
                // Always use the wrapped object value as `this` regardless of coercion status,
                // so that non-native properties/methods may be accessed.
                objectValue,
                shadowConstructorArgs
            );

            // Go through and initialise the default values on the object
            // from the class definition.
            _.forOwn(classObject.instancePropertyDefaults, function (propertyValue, name) {
                properties[name].initialise(propertyValue);
            });

            // Use the optimised instantiator created inside this internal Class' constructor
            // to handle destructors, if applicable.
            classObject.internalInstantiator(objectValue);
        },

        /**
         * Determines whether:
         * - This class' FQCN is the same as the one given, or
         * - This class implements an interface with the name given, or
         * - This class has an ancestor with the name given
         *
         * @param {string} className
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
            _.each(classObject.interfaces, function (interfaceObject) {
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
        }
    });

    return Class;
}, {strict: true});
