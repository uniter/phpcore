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
    require('microdash')
], function (
    _
) {
    var hasOwn = {}.hasOwnProperty,
        NAMESPACE = 'namespace',

        CANNOT_USE_AS_NAME_ALREADY_IN_USE = 'core.cannot_use_as_name_already_in_use';

    /**
     * Represents a block within a PHP module that is inside a namespace statement,
     * containing classes imported with `use` statements etc.
     *
     * @param {ScopeFactory} scopeFactory
     * @param {Namespace} globalNamespace
     * @param {ValueFactory} valueFactory
     * @param {CallStack} callStack
     * @param {Module} module
     * @param {Namespace} namespace
     * @param {boolean} global Whether this namespace scope is the special "invisible" global one
     * @constructor
     */
    function NamespaceScope(
        scopeFactory,
        globalNamespace,
        valueFactory,
        callStack,
        module,
        namespace,
        global
    ) {
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {Namespace}
         */
        this.globalNamespace = globalNamespace;
        /**
         * Imports from `use` statements
         *
         * @type {object}
         */
        this.imports = {};
        /**
         * @type {boolean}
         */
        this.global = global;
        /**
         * @type {Module}
         */
        this.module = module;
        /**
         * @type {Namespace}
         */
        this.namespace = namespace;
        /**
         * @type {ScopeFactory}
         */
        this.scopeFactory = scopeFactory;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(NamespaceScope.prototype, {
        /**
         * Defines a class in the current namespace, either from a JS class/function or from a transpiled PHP class
         *
         * @param {string} name
         * @param {Function|object} definition Either a Function for a native JS class or a transpiled definition object
         * @param {boolean=} autoCoercionEnabled Whether the class should be auto-coercing
         * @returns {ChainableInterface<Class>} Returns a future that resolves to the internal Class instance created
         */
        defineClass: function (
            name,
            definition,
            autoCoercionEnabled
        ) {
            var namespaceScope = this;

            return namespaceScope.namespace.defineClass(name, definition, namespaceScope, autoCoercionEnabled);
        },

        /**
         * Defines a constant for the current namespace, optionally making it case-insensitive
         *
         * @param {string} name
         * @param {Value} value
         * @param {object=} options
         */
        defineConstant: function (name, value, options) {
            this.namespace.defineConstant(name, value, options);
        },

        /**
         * Defines a function in the current namespace, either from a JS class/function
         * or from a transpiled PHP function.
         *
         * @param {string} name
         * @param {Function} func
         * @param {Array=} parametersSpecData
         * @param {Object=} returnTypeSpec
         * @param {boolean=} returnByReference
         * @param {number=} lineNumber
         */
        defineFunction: function (
            name,
            func,
            parametersSpecData,
            returnTypeSpec,
            returnByReference,
            lineNumber
        ) {
            var namespaceScope = this;

            namespaceScope.namespace.defineFunction(
                name,
                func,
                namespaceScope,
                parametersSpecData,
                returnTypeSpec || null,
                Boolean(returnByReference),
                lineNumber
            );
        },

        /**
         * Defines a trait in the current namespace, either from a JS class/function or from a transpiled PHP trait.
         *
         * @param {string} name
         * @param {Function|object} definition Either a Function for a native JS class or a transpiled definition object
         * @param {boolean=} autoCoercionEnabled Whether the trait should be auto-coercing
         * @returns {ChainableInterface<Trait>} Returns a future that resolves to the internal Trait instance created
         */
        defineTrait: function (
            name,
            definition,
            autoCoercionEnabled
        ) {
            var namespaceScope = this;

            return namespaceScope.namespace.defineTrait(name, definition, namespaceScope, autoCoercionEnabled);
        },

        /**
         * Enables strict-types mode for this scope's module.
         */
        enableStrictTypes: function () {
            this.module.enableStrictTypes();
        },

        /**
         * Fetches a class with the given name relative to this namespace scope,
         * autoloading if necessary
         *
         * @param {string} name
         * @returns {ChainableInterface<Class>}
         */
        getClass: function (name) {
            var resolvedClass = this.resolveName(name);

            // Note that as userland autoloaders may have been registered, this may result in a pause
            return resolvedClass.namespace.getClass(resolvedClass.name);
        },

        /**
         * Fetches a constant's value
         *
         * @param {string} name
         * @returns {Value}
         */
        getConstant: function (name) {
            var match,
                scope = this,
                namespace = scope.namespace,
                path,
                prefix,
                usesNamespace = false;

            // Check whether the constant path is absolute, so no 'use's apply
            if (name.charAt(0) === '\\') {
                usesNamespace = true;
                match = name.match(/^\\(.*?)\\([^\\]+)$/);

                if (match) {
                    path = match[1];
                    name = match[2];
                    namespace = scope.globalNamespace.getDescendant(path);
                } else {
                    name = name.substr(1);
                }
            // Check whether the namespace prefix is an alias
            } else {
                match = name.match(/^([^\\]+)(.*?)\\([^\\]+)$/);

                if (match) {
                    usesNamespace = true;
                    prefix = match[1];
                    path = match[2];
                    name = match[3];

                    if (hasOwn.call(scope.imports, prefix.toLowerCase())) {
                        namespace = scope.globalNamespace.getDescendant(scope.imports[prefix.toLowerCase()].substr(1) + path);
                    } else {
                        // Not an alias: look up the namespace path relative to this namespace
                        // (ie. 'namespace Test { echo Our\CONSTANT; }' -> 'echo \Test\Our\CONSTANT;')
                        namespace = scope.globalNamespace.getDescendant(namespace.getPrefix() + prefix + path);
                    }
                }
            }

            return namespace.getConstant(name, usesNamespace);
        },

        /**
         * Creates a NamespaceScope for a sub-Namespace of this one
         *
         * @param {string} name
         * @returns {NamespaceScope}
         */
        getDescendant: function (name) {
            var scope = this;

            return scope.scopeFactory.createNamespaceScope(
                scope.namespace.getDescendant(name),
                scope.module
            );
        },

        /**
         * Fetches the path to the file this scope's parent module originates from
         *
         * @returns {string|null}
         */
        getFilePath: function () {
            return this.module.getFilePath();
        },

        getFunction: function (name) {
            var match,
                scope = this,
                namespace = scope.namespace,
                path,
                prefix;

            // Check whether the function path is absolute, so no 'use's apply
            if (name.charAt(0) === '\\') {
                match = name.match(/^\\(.*?)\\([^\\]+)$/);

                if (match) {
                    path = match[1];
                    name = match[2];
                    namespace = scope.globalNamespace.getDescendant(path);
                } else {
                    name = name.substr(1);
                    namespace = scope.globalNamespace;
                }
                // Check whether the namespace prefix is an alias
            } else {
                match = name.match(/^([^\\]+)(.*?)\\([^\\]+)$/);

                if (match) {
                    prefix = match[1];
                    path = match[2];
                    name = match[3];

                    if (hasOwn.call(scope.imports, prefix.toLowerCase())) {
                        namespace = scope.globalNamespace.getDescendant(scope.imports[prefix.toLowerCase()].substr(1) + path);
                    } else {
                        // Not an alias: look up the namespace path relative to this namespace
                        // (ie. 'namespace Test { Our\Func(); }' -> '\Test\Our\Func();')
                        namespace = scope.globalNamespace.getDescendant(namespace.getPrefix() + prefix + path);
                    }
                }
            }

            return namespace.getFunction(name);
        },

        getGlobalNamespace: function () {
            return this.globalNamespace;
        },

        /**
         * Fetches the module this NamespaceScope exists in
         *
         * @returns {Module}
         */
        getModule: function () {
            return this.module;
        },

        /**
         * Fetches the namespace this scope is in
         *
         * @returns {Namespace}
         */
        getNamespace: function () {
            return this.namespace;
        },

        getNamespaceName: function () {
            var scope = this;

            return scope.valueFactory.createString(scope.namespace.getName());
        },

        /**
         * Fetches the backslash-delimited prefix string for this scope's namespace
         *
         * @returns {string}
         */
        getNamespacePrefix: function () {
            return this.namespace.getPrefix();
        },

        /**
         * Fetches a trait with the given name relative to this namespace scope,
         * autoloading if necessary.
         *
         * @param {string} name
         * @returns {ChainableInterface<Trait>}
         */
        getTrait: function (name) {
            var resolvedTrait = this.resolveName(name);

            // Note that as userland autoloaders may have been registered, this may result in a pause.
            return resolvedTrait.namespace.getTrait(resolvedTrait.name);
        },

        /**
         * Determines whether the specified class is defined for this namespace scope,
         * taking any imports/aliases via `use` into account
         *
         * @param {string} name
         * @returns {boolean}
         */
        hasClass: function (name) {
            var scope = this,
                resolvedClass = scope.resolveName(name);

            // Check whether the entire class name is aliased
            if (hasOwn.call(scope.imports, name.toLowerCase())) {
                return true;
            }

            return resolvedClass.namespace.hasClass(resolvedClass.name);
        },

        /**
         * Determines whether the specified trait is defined for this namespace scope,
         * taking any imports/aliases via `use` into account.
         *
         * @param {string} name
         * @returns {boolean}
         */
        hasTrait: function (name) {
            var scope = this,
                resolvedTrait = scope.resolveName(name);

            // Check whether the entire trait name is aliased.
            if (hasOwn.call(scope.imports, name.toLowerCase())) {
                return true;
            }

            return resolvedTrait.namespace.hasTrait(resolvedTrait.name);
        },

        /**
         * Determines whether this namespace scope is the special "invisible" global one
         *
         * @returns {boolean}
         */
        isGlobal: function () {
            return this.global;
        },

        /**
         * Determines whether the specified class, interface, trait or enum is defined for this namespace scope,
         * taking any imports/aliases via `use` into account.
         *
         * @param {string} name
         * @returns {boolean}
         */
        isNameInUse: function (name) {
            return this.hasClass(name) || this.hasTrait(name);
        },

        /**
         * Determines whether this scope's module is in strict-types mode.
         *
         * @returns {boolean}
         */
        isStrictTypesMode: function () {
            return this.module.isStrictTypesMode();
        },

        /**
         * Resolves a potentially relatively- or fully-qualified class, interface, trait or enum path
         * to the Namespace instance it should be defined by and its name.
         *
         * @param {string} name
         * @returns {{namespace: Namespace, name: string}}
         */
        resolveName: function (name) {
            var loweredPrefix,
                match,
                scope = this,
                namespace = scope.namespace,
                path,
                prefix;

            // Check whether the entire name is aliased.
            if (hasOwn.call(scope.imports, name.toLowerCase())) {
                name = scope.imports[name.toLowerCase()];
                namespace = scope.globalNamespace;
            }

            // Check whether the path is absolute, so no 'use's apply.
            if (name.charAt(0) === '\\') {
                match = name.match(/^\\(.*?)\\([^\\]+)$/);

                if (match) {
                    path = match[1];
                    name = match[2];
                    namespace = scope.globalNamespace.getDescendant(path);
                } else {
                    // A name in the global namespace with explicit absolute path, e.g. `\MyClass`.
                    name = name.substr(1);
                    namespace = scope.globalNamespace;
                }
            // Check whether the namespace prefix is an alias.
            } else {
                match = name.match(/^([^\\]+)(.*?)\\([^\\]+)$/);

                if (match) {
                    prefix = match[1];
                    path = match[2];
                    name = match[3];
                    loweredPrefix = prefix.toLowerCase();

                    if (loweredPrefix === NAMESPACE) {
                        // Reference uses the special "namespace" keyword as a prefix:
                        // resolve relative to the current namespace.
                        namespace = namespace.getDescendant(path.replace(/^\\/, ''));
                    } else if (hasOwn.call(scope.imports, loweredPrefix)) {
                        namespace = scope.globalNamespace.getDescendant(scope.imports[loweredPrefix].substr(1) + path);
                    } else {
                        // Not an alias: look up the namespace path relative to this namespace
                        // (i.e. 'namespace Test { Our\Func(); }' -> '\Test\Our\Func();').
                        namespace = namespace.getDescendant(prefix + path);
                    }
                }
            }

            return {namespace: namespace, name: name};
        },

        /**
         * Imports a class, interface, trait or enum into the current namespace scope,
         * e.g. from a PHP `use ...` statement, optionally with an alias.
         *
         * @param {string} source
         * @param {string=} alias
         */
        use: function (source, alias) {
            var scope = this,
                normalizedSource = source;

            if (!alias) {
                alias = source.replace(/^.*?([^\\]+)$/, '$1');
            }

            if (normalizedSource.charAt(0) !== '\\') {
                normalizedSource = '\\' + normalizedSource;
            }

            if (scope.isNameInUse(alias.toLowerCase())) {
                scope.callStack.raiseUncatchableFatalError(CANNOT_USE_AS_NAME_ALREADY_IN_USE, {
                    alias: alias,
                    source: source
                });
            }

            scope.imports[alias.toLowerCase()] = normalizedSource;
        }
    });

    return NamespaceScope;
}, {strict: true});
