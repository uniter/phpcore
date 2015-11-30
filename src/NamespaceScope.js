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
    var hasOwn = {}.hasOwnProperty,
        PHPFatalError = phpCommon.PHPFatalError;

    function NamespaceScope(globalNamespace, valueFactory, namespace) {
        this.globalNamespace = globalNamespace;
        this.imports = {};
        this.namespace = namespace;
        this.valueFactory = valueFactory;
    }

    _.extend(NamespaceScope.prototype, {
        getClass: function (name) {
            var match,
                scope = this,
                namespace = scope.namespace,
                path,
                prefix;

            // Check whether the entire class name is aliased
            if (hasOwn.call(scope.imports, name.toLowerCase())) {
                name = scope.imports[name.toLowerCase()];
                namespace = scope.globalNamespace;
            }

            // Check whether the class path is absolute, so no 'use's apply
            if (name.charAt(0) === '\\') {
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
                    prefix = match[1];
                    path = match[2];

                    if (hasOwn.call(scope.imports, prefix.toLowerCase())) {
                        namespace = scope.globalNamespace.getDescendant(scope.imports[prefix.toLowerCase()].substr(1) + path);
                        name = match[3];
                    }
                }
            }

            return namespace.getClass(name);
        },

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

        getNamespaceName: function () {
            var scope = this;

            return scope.valueFactory.createString(scope.namespace.getName());
        },

        use: function (source, alias) {
            var scope = this,
                normalizedSource = source;

            if (!alias) {
                alias = source.replace(/^.*?([^\\]+)$/, '$1');
            }

            if (normalizedSource.charAt(0) !== '\\') {
                normalizedSource = '\\' + normalizedSource;
            }

            if (scope.imports[alias.toLowerCase()]) {
                throw new PHPFatalError(
                    PHPFatalError.NAME_ALREADY_IN_USE,
                    {
                        alias: alias,
                        source: source
                    }
                );
            }

            scope.imports[alias.toLowerCase()] = normalizedSource;
        }
    });

    return NamespaceScope;
}, {strict: true});
