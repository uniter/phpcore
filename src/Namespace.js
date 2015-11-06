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
        hasOwn = {}.hasOwnProperty,
        PHPError = phpCommon.PHPError,
        PHPFatalError = phpCommon.PHPFatalError;

    function Namespace(callStack, valueFactory, classAutoloader, parent, name) {
        this.callStack = callStack;
        this.children = {};
        this.classAutoloader = classAutoloader;
        this.classes = {};
        this.constants = {};
        this.functions = {};
        this.name = name;
        this.parent = parent;
        this.valueFactory = valueFactory;
    }

    _.extend(Namespace.prototype, {
        defineClass: function (name, definition, namespaceScope) {
            var classObject,
                constants,
                constructorName = null,
                methodData = {},
                namespace = this,
                staticProperties,
                InternalClass;

            if (_.isFunction(definition)) {
                InternalClass = definition;
            } else {
                InternalClass = function () {
                    var instance = this;

                    if (definition.superClass) {
                        definition.superClass.getInternalClass().call(this);
                    }

                    _.each(definition.properties, function (value, name) {
                        instance[name] = value;
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

                    data.method[IS_STATIC] = data[IS_STATIC];
                    data.method.data = methodData;

                    InternalClass.prototype[methodName] = data.method;
                });

                staticProperties = definition.staticProperties;
                constants = definition.constants;
            }

            classObject = new Class(
                namespace.valueFactory,
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

            methodData.classObject = classObject;

            namespace.classes[name.toLowerCase()] = classObject;

            return classObject;
        },

        defineConstant: function (name, value, options) {
            var caseInsensitive;

            options = options || {};

            caseInsensitive = options.caseInsensitive;

            if (caseInsensitive) {
                name = name.toLowerCase();
            }

            this.constants[name] = {
                caseInsensitive: caseInsensitive,
                value: value
            };
        },

        defineFunction: function (name, func) {
            var namespace = this;

            if (namespace.name === '') {
                if (/__autoload/i.test(name) && func.length !== 1) {
                    throw new PHPFatalError(PHPFatalError.EXPECT_EXACTLY_1_ARG, {name: name.toLowerCase()});
                }
            }

            namespace.functions[name] = func;
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

        getConstant: function (name, usesNamespace) {
            var globalNamespace,
                lowercaseName,
                namespace = this;

            if (hasOwn.call(namespace.constants, name)) {
                return namespace.constants[name].value;
            }

            lowercaseName = name.toLowerCase();

            if (
                hasOwn.call(namespace.constants, lowercaseName) &&
                namespace.constants[lowercaseName].caseInsensitive
            ) {
                return namespace.constants[lowercaseName].value;
            }

            globalNamespace = namespace.getGlobal();

            if (hasOwn.call(globalNamespace.constants, name)) {
                return globalNamespace.constants[name].value;
            }

            if (
                hasOwn.call(globalNamespace.constants, lowercaseName) &&
                globalNamespace.constants[lowercaseName].caseInsensitive
            ) {
                return globalNamespace.constants[lowercaseName].value;
            }

            if (usesNamespace) {
                throw new PHPFatalError(PHPFatalError.UNDEFINED_CONSTANT, {name: namespace.getPrefix() + name});
            } else {
                namespace.callStack.raiseError(PHPError.E_NOTICE, 'Use of undefined constant ' + name + ' - assumed \'' + name + '\'');

                return this.valueFactory.createString(name);
            }
        },

        getDescendant: function (name) {
            var namespace = this;

            _.each(name.split('\\'), function (part) {
                if (!hasOwn.call(namespace.children, part)) {
                    namespace.children[part] = new Namespace(
                        namespace.callStack,
                        namespace.valueFactory,
                        namespace.classAutoloader,
                        namespace,
                        part
                    );
                }

                namespace = namespace.children[part];
            });

            return namespace;
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

            if (hasOwn.call(namespace.functions, name)) {
                return namespace.functions[name];
            }

            globalNamespace = namespace.getGlobal();

            if (hasOwn.call(globalNamespace.functions, name)) {
                return globalNamespace.functions[name];
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

        getOwnFunction: function (name) {
            var namespace = this;

            if (hasOwn.call(namespace.functions, name)) {
                return namespace.functions[name];
            }

            return null;
        },

        getParent: function () {
            return this.parent;
        },

        getPrefix: function () {
            var namespace = this;

            if (namespace.name === '') {
                return '';
            }

            return (namespace.parent ? namespace.parent.getPrefix() : '') + namespace.name + '\\';
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
        }
    });

    return Namespace;
}, {strict: true});
