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
    var CALL_TO_UNDEFINED_FUNCTION = 'core.call_to_undefined_function',
        CANNOT_DECLARE_CLASS_AS_NAME_ALREADY_IN_USE = 'core.cannot_declare_class_as_name_already_in_use',
        CANNOT_IMPLEMENT_THROWABLE = 'core.cannot_implement_throwable',
        CANNOT_REDECLARE_CLASS_AS_NAME_ALREADY_IN_USE = 'core.cannot_redeclare_class_as_name_already_in_use',
        CLASS_NOT_FOUND = 'core.class_not_found',
        CONSTANT_ALREADY_DEFINED = 'core.constant_already_defined',
        UNDEFINED_CONSTANT = 'core.undefined_constant',

        IS_METHOD = 'isMethod',
        IS_STATIC = 'isStatic',
        MAGIC_CONSTRUCT = '__construct',
        hasOwn = {}.hasOwnProperty,
        PHPError = phpCommon.PHPError,
        unwrapArgs = function (args) {
            return _.map(args, function (arg) {
                return arg.getNative();
            });
        };

    /**
     * Represents a single namespace within the namespace hierarchy.
     * For example, the class path `My\Lib\SubNs\MyClass` defines the namespace `My`
     * under the global namespace, with a single Namespace instance for `My`.
     * `SubNs` is another instance, with `My\Lib` as its parent and `My` as its grandparent.
     *
     * The special global namespace has the empty string as its unique name,
     * along with null as its parent namespace.
     *
     * @param {CallStack} callStack
     * @param {ValueFactory} valueFactory
     * @param {NamespaceFactory} namespaceFactory
     * @param {FunctionFactory} functionFactory
     * @param {FunctionSpecFactory} functionSpecFactory
     * @param {ClassAutoloader} classAutoloader
     * @param {Namespace|null} parent
     * @param {string} name
     * @constructor
     */
    function Namespace(
        callStack,
        valueFactory,
        namespaceFactory,
        functionFactory,
        functionSpecFactory,
        classAutoloader,
        parent,
        name
    ) {
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {Object.<string, Namespace>}
         */
        this.children = {};
        /**
         * @type {ClassAutoloader}
         */
        this.classAutoloader = classAutoloader;
        /**
         * @type {Object.<string, Class>}
         */
        this.classes = {};
        /**
         * @type {Object.<string, {caseInsensitive: boolean, name: string, value: Value}>}
         */
        this.constants = {};
        /**
         * @type {FunctionFactory}
         */
        this.functionFactory = functionFactory;
        /**
         * @type {FunctionSpecFactory}
         */
        this.functionSpecFactory = functionSpecFactory;
        /**
         * @type {Object.<string, Function>}
         */
        this.functions = {};
        /**
         * @type {string}
         */
        this.name = name;
        /**
         * @type {NamespaceFactory}
         */
        this.namespaceFactory = namespaceFactory;
        /**
         * @type {Namespace|null}
         */
        this.parent = parent;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(Namespace.prototype, {
        /**
         * Defines the given alias for the given function
         *
         * @param {string} originalName
         * @param {string} aliasName
         * @throws {Error} Throws when the specified original function does not exist
         */
        aliasFunction: function (originalName, aliasName) {
            var existingFunction,
                namespace = this;

            if (!namespace.hasFunction(originalName)) {
                throw new Error('Cannot alias undefined function "' + originalName + '"');
            }

            existingFunction = namespace.getFunction(originalName);

            namespace.functions[aliasName.toLowerCase()] = existingFunction.functionSpec.createAliasFunction(
                aliasName,
                existingFunction.originalFunc,
                namespace.functionSpecFactory,
                namespace.functionFactory
            );
        },

        /**
         * Defines a class in the current namespace, either from a JS class/function or from a transpiled PHP class,
         * where PHPToJS has generated an object containing all the information related to the class
         *
         * @TODO: Consider moving this to NamespaceScope.defineClass(...) rather than having that injected
         *        as a required argument to this method?
         *
         * @param {string} name
         * @param {Function|object} definition Either a Function for a native JS class or a transpiled definition object
         * @param {NamespaceScope} namespaceScope
         * @returns {Class} Returns the internal Class instance created
         */
        defineClass: function (name, definition, namespaceScope) {
            var classObject,
                constants,
                constructorName = null,
                methodData = {},
                methods = {},
                namespace = this,
                proxyConstructor,
                rootInternalPrototype,
                staticProperties,
                InternalClass;

            if (namespaceScope.hasClass(name)) {
                namespace.callStack.raiseUncatchableFatalError(
                    namespace.hasClass(name) ?
                        CANNOT_REDECLARE_CLASS_AS_NAME_ALREADY_IN_USE :
                        CANNOT_DECLARE_CLASS_AS_NAME_ALREADY_IN_USE,
                    {
                        className: namespace.getPrefix() + name
                    }
                );
            }

            if (_.isFunction(definition)) {
                // Class is defined using native JavaScript, not PHP

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

                // Record the prototype object that we should stop at when walking up the chain
                rootInternalPrototype = definition.prototype;
            } else {
                // Class has a definition, so it was defined using PHP

                // Ensure the class does not attempt to implement Throwable directly
                _.each(definition.interfaces, function (interfaceName) {
                    var resolvedClass = namespaceScope.resolveClass(interfaceName);

                    if (resolvedClass.namespace.getName() === '' && resolvedClass.name.toLowerCase() === 'throwable') {
                        namespace.callStack.raiseUncatchableFatalError(
                            CANNOT_IMPLEMENT_THROWABLE,
                            {
                                className: namespace.getPrefix() + name
                            }
                        );
                    }
                });

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
                            // TODO: Change for PHP 7 (see https://www.php.net/manual/en/migration70.incompatible.php)
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

                // Record the prototype object that we should stop at when walking up the chain
                rootInternalPrototype = InternalClass.prototype;
            }

            classObject = new Class(
                namespace.valueFactory,
                namespace.functionFactory,
                namespace.callStack,
                namespace.getPrefix() + name,
                constructorName,
                InternalClass,
                rootInternalPrototype,
                staticProperties,
                constants,
                definition.superClass,
                definition.interfaces,
                namespaceScope
            );

            _.forOwn(methods, function (data, methodName) {
                var functionSpec,
                    lineNumber = data.line,
                    method,
                    methodIsStatic = data[IS_STATIC],
                    // Parameter spec data may only be provided for PHP-transpiled functions
                    parametersSpecData = data.args;

                functionSpec = namespace.functionSpecFactory.createMethodSpec(
                    namespaceScope,
                    classObject,
                    methodName,
                    parametersSpecData || [],
                    namespace.callStack.getLastFilePath(),
                    lineNumber || null
                );

                method = namespace.functionFactory.create(
                    namespaceScope,
                    classObject,
                    data.method,
                    methodName,
                    null,
                    null, // NB: No need to override the class for a method
                    functionSpec
                );

                method[IS_METHOD] = true;
                method[IS_STATIC] = methodIsStatic;
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
         * @param {object=} options
         */
        defineConstant: function (name, value, options) {
            var caseInsensitive,
                effectiveName,
                existingDefinition,
                namespace = this;

            options = options || {};
            caseInsensitive = !!options.caseInsensitive;
            existingDefinition = namespace.getConstantDefinition(name);

            if (existingDefinition !== null) {
                namespace.callStack.raiseTranslatedError(PHPError.E_NOTICE, CONSTANT_ALREADY_DEFINED, {
                    // Use original name in the error message rather than the effective one
                    name: namespace.getPrefix().toLowerCase() + existingDefinition.name
                });

                return; // Do not redefine the existing constant
            }

            effectiveName = caseInsensitive ? name.toLowerCase() : name;

            namespace.constants[effectiveName] = {
                caseInsensitive: caseInsensitive,
                // Store the original name for reference (as the effective one may be lower-cased)
                name: name,
                value: value
            };
        },

        /**
         * Defines a new function within this namespace
         *
         * @param {string} name
         * @param {Function} func
         * @param {NamespaceScope} namespaceScope
         * @param {Array=} parametersSpecData
         * @param {number=} lineNumber
         */
        defineFunction: function (name, func, namespaceScope, parametersSpecData, lineNumber) {
            var functionSpec,
                namespace = this;

            // Parameter spec data may only be provided for PHP-transpiled functions
            functionSpec = namespace.functionSpecFactory.createFunctionSpec(
                namespaceScope,
                name,
                parametersSpecData || [],
                namespace.callStack.getLastFilePath(),
                lineNumber || null
            );

            namespace.functions[name.toLowerCase()] = namespace.functionFactory.create(
                namespaceScope,
                // Class will always be null for 'normal' functions
                // as defining a function inside a class will define it
                // inside the current namespace instead.
                null,
                func,
                name,
                null,
                null,
                functionSpec
            );
        },

        /**
         * Fetches a class definition from within this namespace or a descendant.
         * If applicable, the class autoloader will be invoked.
         *
         * @param {string} name
         * @returns {Class}
         */
        getClass: function (name) {
            var namespace = this,
                parsed = namespace.parseName(name),
                lowerName = parsed.name.toLowerCase();

            if (!hasOwn.call(parsed.namespace.classes, lowerName)) {
                // Try to autoload the class
                namespace.classAutoloader.autoloadClass(parsed.namespace.getPrefix() + parsed.name);

                // Raise an error if it is still not defined
                if (!hasOwn.call(parsed.namespace.classes, lowerName)) {
                    namespace.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NOT_FOUND, {
                        name: parsed.namespace.getPrefix() + parsed.name
                    });
                }
            }

            return parsed.namespace.classes[lowerName];
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
                namespace.callStack.raiseTranslatedError(PHPError.E_ERROR, UNDEFINED_CONSTANT, {
                    name: namespace.getPrefix() + name
                });
            }

            namespace.callStack.raiseError(
                PHPError.E_WARNING,
                'Use of undefined constant ' + name + ' - assumed \'' + name + '\' ' +
                '(this will throw an Error in a future version of PHP)'
            );

            return this.valueFactory.createString(name);
        },

        /**
         * Fetches a sub-namespace within this one, by its name. Any namespaces in the hierarchy
         * that do not exist will be created and then cached on-demand
         *
         * @param {string} name
         * @returns {Namespace}
         */
        getDescendant: function (name) {
            var namespace = this,
                subNamespace = namespace;

            if (name === '') {
                throw new Error('Namespace.getDescendant() :: Name cannot be empty');
            }

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

        /**
         * Fetches a function from the current namespace if defined, otherwise falls back
         * to the global namespace. Raises an error if the function is not defined at all
         *
         * @param {string|Function} name
         * @returns {Function}
         */
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

            namespace.callStack.raiseTranslatedError(PHPError.E_ERROR, CALL_TO_UNDEFINED_FUNCTION, {
                name: namespace.getPrefix() + name
            });
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
         * @returns {object|null}
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

        /**
         * Determines whether or not the given class exists in this namespace (or a descendant of it)
         * without invoking the autoloader if it does not
         *
         * @param {string} name
         * @returns {boolean}
         */
        hasClass: function (name) {
            var namespace = this,
                parsed = namespace.parseName(name),
                lowerName = parsed.name.toLowerCase();

            return hasOwn.call(parsed.namespace.classes, lowerName);
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

        /**
         * Returns true if this namespace defines the specified function, and false otherwise.
         * Note that function names are case-insensitive
         *
         * @param {string} name
         * @returns {boolean}
         */
        hasFunction: function (name) {
            var namespace = this,
                parsed = namespace.parseName(name),
                lowerName = parsed.name.toLowerCase();

            return hasOwn.call(parsed.namespace.functions, lowerName);
        },

        /**
         * Parses a class, function or constant name to its namespace and name
         *
         * @param {string} name
         * @returns {{namespace: (Namespace), name: string}}
         */
        parseName: function (name) {
            var match = name.match(/^(\\?)(.*?)\\?([^\\]+)$/),
                namespace = this,
                path,
                relativeToGlobalNamespace,
                subNamespace;

            if (match) {
                // Name was fully-qualified: return the resolved namespace it was inside

                relativeToGlobalNamespace = (match[1] === '\\');

                path = match[2];
                name = match[3];

                subNamespace = relativeToGlobalNamespace ? namespace.getGlobalNamespace() : namespace;

                if (path !== '') {
                    subNamespace = subNamespace.getDescendant(path);
                }

                return {
                    namespace: subNamespace,
                    name: name
                };
            }

            return {
                namespace: namespace,
                name: name
            };
        },

        resolveClass: function (name) {
            return name;
        }
    });

    return Namespace;
}, {strict: true});
