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
    require('phpcommon')
], function (
    _,
    phpCommon
) {
    var CALL_TO_UNDEFINED_FUNCTION = 'core.call_to_undefined_function',
        CANNOT_DECLARE_CLASS_AS_NAME_ALREADY_IN_USE = 'core.cannot_declare_class_as_name_already_in_use',
        CANNOT_DECLARE_TRAIT_AS_NAME_ALREADY_IN_USE = 'core.cannot_declare_trait_as_name_already_in_use',
        CANNOT_REDECLARE_BUILTIN_FUNCTION = 'core.cannot_redeclare_builtin_function',
        CANNOT_REDECLARE_CLASS_AS_NAME_ALREADY_IN_USE = 'core.cannot_redeclare_class_as_name_already_in_use',
        CANNOT_REDECLARE_TRAIT_AS_NAME_ALREADY_IN_USE = 'core.cannot_redeclare_trait_as_name_already_in_use',
        CANNOT_REDECLARE_USERLAND_FUNCTION = 'core.cannot_redeclare_userland_function',
        CLASS_NOT_FOUND = 'core.class_not_found',
        CONSTANT_ALREADY_DEFINED = 'core.constant_already_defined',
        TRAIT_NOT_FOUND = 'core.trait_not_found',
        UNDEFINED_CONSTANT = 'core.undefined_constant',

        hasOwn = {}.hasOwnProperty,
        PHPError = phpCommon.PHPError;

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
     * @param {Flow} flow
     * @param {ValueFactory} valueFactory
     * @param {NamespaceFactory} namespaceFactory
     * @param {FunctionFactory} functionFactory
     * @param {FunctionSpecFactory} functionSpecFactory
     * @param {OverloadedFunctionDefiner} overloadedFunctionDefiner
     * @param {ClassAutoloader} classAutoloader
     * @param {ClassDefiner} classDefiner
     * @param {TraitDefiner} traitDefiner
     * @param {Namespace|null} parent
     * @param {string} name
     * @constructor
     */
    function Namespace(
        callStack,
        flow,
        valueFactory,
        namespaceFactory,
        functionFactory,
        functionSpecFactory,
        overloadedFunctionDefiner,
        classAutoloader,
        classDefiner,
        traitDefiner,
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
         * @type {ClassDefiner}
         */
        this.classDefiner = classDefiner;
        /**
         * @type {Object.<string, Class>}
         */
        this.classes = {};
        /**
         * @type {Object.<string, {caseInsensitive: boolean, name: string, value: Value}>}
         */
        this.constants = {};
        /**
         * @type {Flow}
         */
        this.flow = flow;
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
         * @type {OverloadedFunctionDefiner}
         */
        this.overloadedFunctionDefiner = overloadedFunctionDefiner;
        /**
         * @type {Namespace|null}
         */
        this.parent = parent;
        /**
         * @type {TraitDefiner}
         */
        this.traitDefiner = traitDefiner;
        /**
         * @type {Object.<string, Trait>}
         */
        this.traits = {};
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
         * @param {boolean=} autoCoercionEnabled Whether the class should be auto-coercing
         * @param {Function=} methodCaller Custom method call handler
         * @returns {ChainableInterface<Class>}
         */
        defineClass: function (
            name,
            definition,
            namespaceScope,
            autoCoercionEnabled,
            methodCaller
        ) {
            var
                // TODO: Should we parse the name here to allow for nested namespace paths?
                lowerName = name.toLowerCase(),
                namespace = this;

            autoCoercionEnabled = Boolean(autoCoercionEnabled);
            methodCaller = methodCaller || null;

            if (namespaceScope.isNameInUse(name)) {
                namespace.callStack.raiseUncatchableFatalError(
                    namespace.hasClass(name) ?
                        CANNOT_REDECLARE_CLASS_AS_NAME_ALREADY_IN_USE :
                        CANNOT_DECLARE_CLASS_AS_NAME_ALREADY_IN_USE,
                    {
                        className: namespace.getPrefix() + name
                    }
                );
            }

            return namespace.classDefiner.defineClass(
                name,
                definition,
                namespace,
                namespaceScope,
                autoCoercionEnabled,
                methodCaller
            )
                .next(function (classObject) {
                    // TODO: What happens if during this class/interface load it is requested again? Add integration test
                    namespace.classes[lowerName] = classObject;

                    return classObject;
                });
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
         * Defines a new function within this namespace.
         *
         * @param {string} name
         * @param {Function} func
         * @param {NamespaceScope} namespaceScope
         * @param {Array=} parametersSpecData
         * @param {Object|null} returnTypeSpecData
         * @param {boolean=} returnByReference
         * @param {number=} lineNumber
         */
        defineFunction: function (
            name,
            func,
            namespaceScope,
            parametersSpecData,
            returnTypeSpecData,
            returnByReference,
            lineNumber
        ) {
            var functionSpec,
                isBuiltin,
                lowerName = name.toLowerCase(),
                namespace = this,
                originalSpec;

            if (hasOwn.call(namespace.functions, lowerName)) {
                originalSpec = namespace.functions[lowerName].functionSpec;
                isBuiltin = originalSpec.isBuiltin();

                namespace.callStack.raiseUncatchableFatalError(
                    isBuiltin ?
                        CANNOT_REDECLARE_BUILTIN_FUNCTION :
                        CANNOT_REDECLARE_USERLAND_FUNCTION,
                    isBuiltin ?
                        {
                            functionName: namespace.getPrefix() + name
                        } :
                        {
                            functionName: namespace.getPrefix() + name,
                            originalFile: originalSpec.getFilePath(),
                            originalLine: originalSpec.getLineNumber()
                        }
                );
            }

            functionSpec = namespace.functionSpecFactory.createFunctionSpec(
                namespaceScope,
                name,
                parametersSpecData || [],
                func,
                returnTypeSpecData,
                returnByReference,
                namespace.callStack.getLastFilePath(),
                lineNumber || null
            );

            namespace.functions[lowerName] = namespace.functionFactory.create(
                namespaceScope,
                // Class will always be null for 'normal' functions
                // as defining a function inside a class will define it
                // inside the current namespace instead.
                null,
                null,
                null,
                functionSpec
            );
        },

        /**
         * Defines a new overloaded function within this namespace.
         *
         * @param {string} name
         * @param {OverloadedFunctionVariant[]} variants
         * @param {NamespaceScope} namespaceScope
         */
        defineOverloadedFunction: function (
            name,
            variants,
            namespaceScope
        ) {
            var isBuiltin,
                lowerName = name.toLowerCase(),
                namespace = this,
                originalSpec;

            if (hasOwn.call(namespace.functions, lowerName)) {
                originalSpec = namespace.functions[lowerName].functionSpec;
                isBuiltin = originalSpec.isBuiltin();

                namespace.callStack.raiseUncatchableFatalError(
                    isBuiltin ?
                        CANNOT_REDECLARE_BUILTIN_FUNCTION :
                        CANNOT_REDECLARE_USERLAND_FUNCTION,
                    isBuiltin ?
                        {
                            functionName: namespace.getPrefix() + name
                        } :
                        {
                            functionName: namespace.getPrefix() + name,
                            originalFile: originalSpec.getFilePath(),
                            originalLine: originalSpec.getLineNumber()
                        }
                );
            }

            namespace.functions[lowerName] = namespace.overloadedFunctionDefiner.defineFunction(
                namespace.getPrefix() + name,
                variants,
                namespaceScope
            );
        },

        /**
         * Defines a trait in the current namespace, either from a JS trait/function or from a transpiled PHP trait,
         * where PHPToJS has generated an object containing all the information related to the trait.
         *
         * @param {string} name
         * @param {Function|object} definition Either a Function for a native JS class or a transpiled definition object
         * @param {NamespaceScope} namespaceScope
         * @param {boolean=} autoCoercionEnabled Whether the trait should be auto-coercing
         * @returns {ChainableInterface<Trait>}
         */
        defineTrait: function (
            name,
            definition,
            namespaceScope,
            autoCoercionEnabled
        ) {
            var
                // TODO: Should we parse the name here to allow for nested namespace paths?
                lowerName = name.toLowerCase(),
                namespace = this;

            autoCoercionEnabled = Boolean(autoCoercionEnabled);

            if (namespaceScope.isNameInUse(name)) {
                namespace.callStack.raiseUncatchableFatalError(
                    namespace.hasTrait(name) ?
                        CANNOT_REDECLARE_TRAIT_AS_NAME_ALREADY_IN_USE :
                        CANNOT_DECLARE_TRAIT_AS_NAME_ALREADY_IN_USE,
                    {
                        traitName: namespace.getPrefix() + name
                    }
                );
            }

            return namespace.traitDefiner.defineTrait(
                name,
                definition,
                namespace,
                namespaceScope,
                autoCoercionEnabled
            )
                .next(function (traitObject) {
                    // TODO: What happens if during this trait load it is requested again? Add integration test.
                    namespace.traits[lowerName] = traitObject;

                    return traitObject;
                });
        },

        /**
         * Fetches a class definition from within this namespace or a descendant.
         * If applicable, the class autoloader will be invoked.
         *
         * @param {string} name
         * @param {boolean} autoload Whether to attempt to autoload the class if it is not defined
         * @returns {ChainableInterface<Class>}
         */
        getClass: function (name, autoload) {
            var namespace = this,
                parsed = namespace.parseName(name),
                lowerName = parsed.name.toLowerCase();

            if (hasOwn.call(parsed.namespace.classes, lowerName)) {
                // Class already exists; just return it.
                // TODO: Make Class implement ChainableInterface to avoid always Future-wrapping.
                return namespace.flow.chainify(parsed.namespace.classes[lowerName]);
            }

            // Otherwise the class must be successfully autoloaded or we fail.

            return namespace.flow.chainifyCallbackFrom(function (resolve) {
                if (autoload !== false) {
                    // Try to autoload the class.
                    resolve(namespace.classAutoloader.autoloadClass(parsed.namespace.getPrefix() + parsed.name));
                } else {
                    resolve();
                }
            }).next(function () {
                // Raise an error if it is still not defined.
                if (!parsed.namespace.hasClass(lowerName)) {
                    namespace.callStack.raiseTranslatedError(PHPError.E_ERROR, CLASS_NOT_FOUND, {
                        name: parsed.namespace.getPrefix() + parsed.name
                    });
                }

                return parsed.namespace.getClass(lowerName);
            });
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
         * Fetches a trait definition from within this namespace or a descendant.
         * If applicable, the autoloader will be invoked.
         *
         * @param {string} name
         * @param {boolean} autoload Whether to attempt to autoload the trait if it is not defined
         * @returns {ChainableInterface<Trait>}
         */
        getTrait: function (name, autoload) {
            var namespace = this,
                parsed = namespace.parseName(name),
                lowerName = parsed.name.toLowerCase();

            if (hasOwn.call(parsed.namespace.traits, lowerName)) {
                // Trait already exists; just return it.
                // TODO: Make Trait implement ChainableInterface to avoid always Present-wrapping.
                return namespace.flow.chainify(parsed.namespace.traits[lowerName]);
            }

            // Otherwise the trait must be successfully autoloaded or we fail.

            return namespace.flow.chainifyCallbackFrom(function (resolve) {
                if (autoload !== false) {
                    // Try to autoload the trait.
                    resolve(namespace.classAutoloader.autoloadClass(parsed.namespace.getPrefix() + parsed.name));
                } else {
                    resolve();
                }
            }).next(function () {
                // Raise an error if it is still not defined.
                if (!parsed.namespace.hasTrait(lowerName)) {
                    namespace.callStack.raiseTranslatedError(PHPError.E_ERROR, TRAIT_NOT_FOUND, {
                        name: parsed.namespace.getPrefix() + parsed.name
                    });
                }

                return parsed.namespace.getTrait(lowerName);
            });
        },

        /**
         * Determines whether the given class exists in this namespace (or a descendant of it)
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
         * Determines whether the given trait exists in this namespace (or a descendant of it),
         * without invoking the autoloader if it does not.
         *
         * @param {string} name
         * @returns {boolean}
         */
        hasTrait: function (name) {
            var namespace = this,
                parsed = namespace.parseName(name),
                lowerName = parsed.name.toLowerCase();

            return hasOwn.call(parsed.namespace.traits, lowerName);
        },

        /**
         * Determines whether the given class, interface, trait or enum exists in this namespace
         * (or a descendant of it), without invoking the autoloader if it does not.
         *
         * @param {string} name
         * @returns {boolean}
         */
        isNameInUse: function (name) {
            return this.hasClass(name) || this.hasTrait(name);
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
