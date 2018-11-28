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
    require('./Class')
], function (
    _,
    phpCommon,
    Class
) {
    var IS_STATIC = 'isStatic',
        MAGIC_CONSTRUCT = '__construct',
        hasOwn = {}.hasOwnProperty,
        PHPError = phpCommon.PHPError,
        PHPFatalError = phpCommon.PHPFatalError,
        unwrapArgs = function (args) {
            return _.map(args, function (arg) {
                return arg.getNative();
            });
        };

    function Namespace(callStack, valueFactory, namespaceFactory, functionFactory, classAutoloader, parent, name) {
        this.callStack = callStack;
        this.children = {};
        this.classAutoloader = classAutoloader;
        this.classes = {};
        this.constants = {};
        this.functionFactory = functionFactory;
        this.functions = {};
        this.name = name;
        this.namespaceFactory = namespaceFactory;
        this.parent = parent;
        this.valueFactory = valueFactory;
    }

    _.extend(Namespace.prototype, {
        defineClass: function (name, definition, namespaceScope) {
            var classObject,
                constants,
                constructorName = null,
                methodData = {},
                methods = {},
                namespace = this,
                proxyConstructor,
                staticProperties,
                InternalClass;

            if (_.isFunction(definition)) {
                // Create a new, empty native constructor so that we can avoid calling
                // the original if the derived class does not call parent::__construct(...)
                // - Unless the class defines the special `shadowConstructor` property, which
                //   is always called regardless of whether the parent constructor is called explicitly
                InternalClass = function () {
                    var objectValue = this;

                    if (definition.shadowConstructor) {
                        definition.shadowConstructor.call(
                            // Use the native object as the `this` object inside the shadow constructor
                            // if auto-coercion is enabled, otherwise use the ObjectValue
                            classObject.isAutoCoercionEnabled() ? objectValue.getObject() : objectValue
                        );
                    }

                    if (definition.superClass) {
                        // Class has a parent, call the parent's internal constructor
                        definition.superClass.getInternalClass().call(objectValue);
                    }
                };
                InternalClass.prototype = Object.create(definition.prototype);
                proxyConstructor = function () {
                    var args = arguments,
                        objectValue = this,
                        unwrappedArgs = classObject.isAutoCoercionEnabled() ? unwrapArgs(args) : args,
                        // Use the native object as the `this` object inside the (shadow) constructor
                        // if auto-coercion is enabled, otherwise use the ObjectValue
                        unwrappedThisObject = classObject.isAutoCoercionEnabled() ?
                            objectValue.getObject() :
                            objectValue;

                    // Call the original native constructor
                    definition.apply(unwrappedThisObject, unwrappedArgs);

                    // Call magic __construct method if defined for the original native class
                    if (definition.prototype[MAGIC_CONSTRUCT]) {
                        definition.prototype[MAGIC_CONSTRUCT].apply(unwrappedThisObject, unwrappedArgs);
                    }
                };
                proxyConstructor.neverCoerce = true;
                proxyConstructor.data = methodData;
                InternalClass.prototype[MAGIC_CONSTRUCT] = proxyConstructor;
                constructorName = MAGIC_CONSTRUCT;
            } else {
                // Class has a definition, so it was defined using PHP
                InternalClass = function () {
                    var objectValue = this,
                        properties = {};

                    // Go through and declare the properties and their default values
                    // on the object from the class definition
                    _.forOwn(definition.properties, function (propertyData, name) {
                        properties[name] = objectValue.declareProperty(name, classObject, propertyData.visibility);
                    });

                    if (definition.superClass) {
                        // Class has a parent, call the parent's internal constructor
                        definition.superClass.getInternalClass().call(objectValue);
                    }

                    // Go through and define the properties and their default values
                    // on the object from the class definition by initialising them
                    _.forOwn(definition.properties, function (propertyData, name) {
                        var instanceProperty = properties[name],
                            initialValue = propertyData.value();

                        if (initialValue === null) {
                            // If a property has no initialiser then its initial value is NULL
                            initialValue = namespace.valueFactory.createNull();
                        }

                        instanceProperty.initialise(initialValue);
                    });
                };

                // Prevent native 'constructor' property from erroneously being detected as PHP class method
                delete InternalClass.prototype.constructor;

                if (definition.superClass) {
                    InternalClass.prototype = Object.create(definition.superClass.getInternalClass().prototype);
                }

                _.each(definition.methods, function (data, methodName) {
                    // PHP5-style __construct magic method takes precedence
                    if (methodName === '__construct') {
                        if (constructorName) {
                            namespace.callStack.raiseError(PHPError.E_STRICT, 'Redefining already defined constructor for class ' + name);
                        }

                        constructorName = methodName;
                    }

                    if (!constructorName && methodName === name) {
                        constructorName = methodName;
                    }

                    methods[methodName] = data;
                });

                staticProperties = definition.staticProperties;
                constants = definition.constants;
            }

            classObject = new Class(
                namespace.valueFactory,
                namespace.functionFactory,
                namespace.callStack,
                namespace.getPrefix() + name,
                constructorName,
                InternalClass,
                staticProperties,
                constants,
                definition.superClass,
                definition.interfaces,
                namespaceScope
            );

            _.forOwn(methods, function (data, methodName) {
                var method = namespace.functionFactory.create(
                        namespaceScope,
                        classObject,
                        data.method,
                        methodName
                    );

                method[IS_STATIC] = data[IS_STATIC];
                method.data = methodData;

                InternalClass.prototype[methodName] = method;
            });

            methodData.classObject = classObject;

            namespace.classes[name.toLowerCase()] = classObject;

            return classObject;
        },

        /**
         * Defines a constant for the current namespace, optionally making it case-insensitive
         *
         * @param {string} name
         * @param {Value} value
         * @param {object|undefined} options
         */
        defineConstant: function (name, value, options) {
            var caseInsensitive;

            options = options || {};

            caseInsensitive = !!options.caseInsensitive;

            if (caseInsensitive) {
                name = name.toLowerCase();
            }

            this.constants[name] = {
                caseInsensitive: caseInsensitive,
                value: value
            };
        },

        defineFunction: function (name, func, namespaceScope) {
            var namespace = this;

            if (namespace.name === '') {
                if (/__autoload/i.test(name) && func.length !== 1) {
                    throw new PHPFatalError(PHPFatalError.EXPECT_EXACTLY_1_ARG, {name: name.toLowerCase()});
                }
            }

            namespace.functions[name.toLowerCase()] = namespace.functionFactory.create(
                namespaceScope,
                // Class will always be null for 'normal' functions
                // as defining a function inside a class will define it
                // inside the current namespace instead.
                null,
                func,
                name
            );
        },

        getClass: function (name) {
            var lowerName = name.toLowerCase(),
                namespace = this,
                parsed = namespace.parseClassName(name);

            if (parsed) {
                return parsed.namespace.getClass(parsed.name);
            }

            if (!hasOwn.call(namespace.classes, lowerName)) {
                // Try to autoload the class
                namespace.classAutoloader.autoloadClass(namespace.getPrefix() + name);

                // Raise an error if it is still not defined
                if (!hasOwn.call(namespace.classes, lowerName)) {
                    throw new PHPFatalError(PHPFatalError.CLASS_NOT_FOUND, {name: namespace.getPrefix() + name});
                }
            }

            return namespace.classes[lowerName];
        },

        /**
         * Fetches the value of a constant if it is defined. If it is not defined,
         * then it will either raise a notice and return the name of the constant as a string,
         * or throw an exception, depending on whether it is a namespaced constant
         *
         * @param {string} name
         * @param {boolean} usesNamespace
         * @returns {Value}
         */
        getConstant: function (name, usesNamespace) {
            var namespace = this,
                constant = namespace.getConstantDefinition(name);

            if (constant) {
                return constant.value;
            }

            if (usesNamespace) {
                throw new PHPFatalError(PHPFatalError.UNDEFINED_CONSTANT, {name: namespace.getPrefix() + name});
            } else {
                namespace.callStack.raiseError(PHPError.E_NOTICE, 'Use of undefined constant ' + name + ' - assumed \'' + name + '\'');

                return this.valueFactory.createString(name);
            }
        },

        getDescendant: function (name) {
            var namespace = this,
                subNamespace = namespace;

            _.each(name.split('\\'), function (part) {
                if (!hasOwn.call(subNamespace.children, part.toLowerCase())) {
                    subNamespace.children[part.toLowerCase()] = namespace.namespaceFactory.create(
                        subNamespace,
                        part
                    );
                }

                subNamespace = subNamespace.children[part.toLowerCase()];
            });

            return subNamespace;
        },

        getFunction: function (name) {
            var globalNamespace,
                match,
                namespace = this,
                path,
                subNamespace;

            if (_.isFunction(name)) {
                return name;
            }

            match = name.match(/^(.*?)\\([^\\]+)$/);

            if (match) {
                path = match[1];
                name = match[2];

                subNamespace = namespace.getDescendant(path);

                return subNamespace.getFunction(name);
            }

            if (hasOwn.call(namespace.functions, name.toLowerCase())) {
                return namespace.functions[name.toLowerCase()];
            }

            globalNamespace = namespace.getGlobal();

            if (hasOwn.call(globalNamespace.functions, name.toLowerCase())) {
                return globalNamespace.functions[name.toLowerCase()];
            }

            throw new PHPFatalError(PHPFatalError.CALL_TO_UNDEFINED_FUNCTION, {name: namespace.getPrefix() + name});
        },

        getGlobal: function () {
            var namespace = this;

            return namespace.name === '' ? namespace : namespace.getParent().getGlobal();
        },

        getGlobalNamespace: function () {
            return this.getGlobal();
        },

        getName: function () {
            var namespace = this;

            if (namespace.name === '') {
                return '';
            }

            return (namespace.parent ? namespace.parent.getPrefix() : '') + namespace.name;
        },

        getOwnFunction: function (name) {
            var namespace = this;

            if (hasOwn.call(namespace.functions, name.toLowerCase())) {
                return namespace.functions[name.toLowerCase()];
            }

            return null;
        },

        getParent: function () {
            return this.parent;
        },

        getPrefix: function () {
            var name = this.getName();

            if (name !== '') {
                name += '\\';
            }

            return name;
        },

        /**
         * Fetches the definition object for a constant, or null if it is not defined
         *
         * @param {string} name
         * @returns {object}
         */
        getConstantDefinition: function (name) {
            var globalNamespace,
                lowercaseName,
                namespace = this;

            if (hasOwn.call(namespace.constants, name)) {
                return namespace.constants[name];
            }

            lowercaseName = name.toLowerCase();

            if (
                hasOwn.call(namespace.constants, lowercaseName) &&
                namespace.constants[lowercaseName].caseInsensitive
            ) {
                return namespace.constants[lowercaseName];
            }

            globalNamespace = namespace.getGlobal();

            if (hasOwn.call(globalNamespace.constants, name)) {
                return globalNamespace.constants[name];
            }

            if (
                hasOwn.call(globalNamespace.constants, lowercaseName) &&
                globalNamespace.constants[lowercaseName].caseInsensitive
            ) {
                return globalNamespace.constants[lowercaseName];
            }

            return null;
        },

        hasClass: function (name) {
            var lowerName = name.toLowerCase(),
                namespace = this,
                parsed = namespace.parseClassName(name);

            if (parsed) {
                return parsed.namespace.hasClass(parsed.name);
            }

            return hasOwn.call(namespace.classes, lowerName);
        },

        /**
         * Returns true if this namespace defines the specified constant, and false otherwise.
         * If the constant is case-insensitive, then it will be returned for any case
         *
         * @param {string} name
         * @returns {boolean}
         */
        hasConstant: function (name) {
            return this.getConstantDefinition(name) !== null;
        },

        parseClassName: function (name) {
            var match = name.match(/^(.*?)\\([^\\]+)$/),
                namespace = this,
                path,
                subNamespace;

            if (match) {
                path = match[1];
                name = match[2];

                subNamespace = namespace.getDescendant(path);

                return {
                    namespace: subNamespace,
                    name: name
                };
            }

            return null;
        },

        resolveClass: function (name) {
            return name;
        }
    });

    return Namespace;
}, {strict: true});
