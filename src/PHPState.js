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
    require('./builtin/builtins'),
    require('util'),
    require('./Call'),
    require('./CallFactory'),
    require('./CallStack'),
    require('./ClassAutoloader'),
    require('./FunctionFactory'),
    require('./INIState'),
    require('./Namespace'),
    require('./NamespaceFactory'),
    require('./ReferenceFactory'),
    require('./Scope'),
    require('./ScopeFactory'),
    require('./ValueFactory')
], function (
    _,
    builtinTypes,
    util,
    Call,
    CallFactory,
    CallStack,
    ClassAutoloader,
    FunctionFactory,
    INIState,
    Namespace,
    NamespaceFactory,
    ReferenceFactory,
    Scope,
    ScopeFactory,
    ValueFactory
) {
    var EXCEPTION_CLASS = 'Exception',
        setUpState = function (state, installedBuiltinTypes) {
            var globalNamespace = state.globalNamespace,
                internals = {
                    callStack: state.callStack,
                    classAutoloader: state.classAutoloader,
                    globalNamespace: globalNamespace,
                    iniState: state.iniState,
                    pausable: state.pausable,
                    stdout: state.stdout,
                    valueFactory: state.valueFactory
                };

            function installFunctionGroup(groupFactory) {
                var groupBuiltins = groupFactory(internals);

                _.each(groupBuiltins, function (fn, name) {
                    globalNamespace.defineFunction(name, fn);
                });
            }

            function installClass(classFactory, name) {
                var Class = classFactory(internals);

                if (name === EXCEPTION_CLASS) {
                    state.PHPException = Class;
                }

                globalNamespace.defineClass(name, Class);
            }

            function installConstantGroup(groupFactory) {
                var groupBuiltins = groupFactory(internals);

                _.each(groupBuiltins, function (value, name) {
                    globalNamespace.defineConstant(name, state.valueFactory.coerce(value));
                });
            }

            // Core builtins
            _.each(builtinTypes.functionGroups, installFunctionGroup);
            _.forOwn(builtinTypes.classes, installClass);
            _.each(builtinTypes.constantGroups, installConstantGroup);

            // Optional installed builtins
            _.each(installedBuiltinTypes.functionGroups, installFunctionGroup);
            _.forOwn(installedBuiltinTypes.classes, installClass);
            _.each(installedBuiltinTypes.constantGroups, installConstantGroup);
        };

    function PHPState(installedBuiltinTypes, stdin, stdout, stderr, pausable) {
        var callStack = new CallStack(stderr),
            callFactory = new CallFactory(Call),
            valueFactory = new ValueFactory(pausable, callStack),
            classAutoloader = new ClassAutoloader(valueFactory),
            scopeFactory = new ScopeFactory(Scope, callStack, valueFactory),
            functionFactory = new FunctionFactory(scopeFactory, callFactory, valueFactory, callStack),
            namespaceFactory = new NamespaceFactory(
                Namespace,
                callStack,
                functionFactory,
                valueFactory,
                classAutoloader
            ),
            globalNamespace = namespaceFactory.create();

        scopeFactory.setFunctionFactory(functionFactory);
        classAutoloader.setGlobalNamespace(globalNamespace);
        valueFactory.setGlobalNamespace(globalNamespace);

        this.callStack = callStack;
        this.globalNamespace = globalNamespace;
        this.globalScope = scopeFactory.create(globalNamespace);
        this.iniState = new INIState();
        this.referenceFactory = new ReferenceFactory(valueFactory);
        this.callStack = callStack;
        this.classAutoloader = classAutoloader;
        this.pausable = pausable;
        this.stderr = stderr;
        this.stdin = stdin;
        this.stdout = stdout;
        this.valueFactory = valueFactory;
        this.PHPException = null;

        setUpState(this, installedBuiltinTypes);
    }

    _.extend(PHPState.prototype, {
        getCallStack: function () {
            return this.callStack;
        },

        getGlobalNamespace: function () {
            return this.globalNamespace;
        },

        getGlobalScope: function () {
            return this.globalScope;
        },

        getPHPExceptionClass: function () {
            return this.PHPException;
        },

        getReferenceFactory: function () {
            return this.referenceFactory;
        },

        getStderr: function () {
            return this.stderr;
        },

        getStdin: function () {
            return this.stdin;
        },

        getStdout: function () {
            return this.stdout;
        },

        getValueFactory: function () {
            return this.valueFactory;
        }
    });

    return PHPState;
}, {strict: true});
