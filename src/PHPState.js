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
    require('./Reference/AccessorReference'),
    require('./Call'),
    require('./CallFactory'),
    require('./CallStack'),
    require('./ClassAutoloader'),
    require('./Closure'),
    require('./ClosureFactory'),
    require('./FunctionFactory'),
    require('./INIState'),
    require('./Namespace'),
    require('./NamespaceFactory'),
    require('./Reference/Null'),
    require('./ReferenceFactory'),
    require('./Scope'),
    require('./ScopeFactory'),
    require('./SuperGlobalScope'),
    require('./ValueFactory'),
    require('./Reference/Variable')
], function (
    _,
    builtinTypes,
    util,
    AccessorReference,
    Call,
    CallFactory,
    CallStack,
    ClassAutoloader,
    Closure,
    ClosureFactory,
    FunctionFactory,
    INIState,
    Namespace,
    NamespaceFactory,
    NullReference,
    ReferenceFactory,
    Scope,
    ScopeFactory,
    SuperGlobalScope,
    ValueFactory,
    VariableReference
) {
    var EXCEPTION_CLASS = 'Exception',
        setUpState = function (state, installedBuiltinTypes) {
            var globalNamespace = state.globalNamespace,
                internals = {
                    callStack: state.callStack,
                    classAutoloader: state.classAutoloader,
                    globalNamespace: globalNamespace,
                    iniState: state.iniState,
                    optionSet: state.optionSet,
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
                var definedUnwrapper = null,
                    enableAutoCoercion = true,
                    Class = classFactory(_.extend({}, internals, {
                        defineUnwrapper: function (unwrapper) {
                            definedUnwrapper = unwrapper;
                        },
                        disableAutoCoercion: function () {
                            enableAutoCoercion = false;
                        }
                    })),
                    classObject,
                    namespace = globalNamespace,
                    parsed = globalNamespace.parseClassName(name);

                if (name === EXCEPTION_CLASS) {
                    state.PHPException = Class;
                }

                if (parsed) {
                    namespace = parsed.namespace;
                    name = parsed.name;
                }

                classObject = namespace.defineClass(name, Class);

                if (definedUnwrapper) {
                    classObject.defineUnwrapper(definedUnwrapper);
                }

                if (enableAutoCoercion) {
                    classObject.enableAutoCoercion();
                }
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

    function PHPState(installedBuiltinTypes, stdin, stdout, stderr, pausable, optionSet) {
        var callStack = new CallStack(stderr),
            callFactory = new CallFactory(Call),
            valueFactory = new ValueFactory(pausable, callStack),
            referenceFactory = new ReferenceFactory(
                AccessorReference,
                NullReference,
                VariableReference,
                valueFactory
            ),
            classAutoloader = new ClassAutoloader(valueFactory),
            superGlobalScope = new SuperGlobalScope(callStack, valueFactory),
            scopeFactory = new ScopeFactory(Scope, callStack, superGlobalScope, valueFactory, referenceFactory),
            functionFactory = new FunctionFactory(scopeFactory, callFactory, valueFactory, callStack),
            closureFactory = new ClosureFactory(functionFactory, valueFactory, Closure),
            namespaceFactory = new NamespaceFactory(
                Namespace,
                callStack,
                functionFactory,
                valueFactory,
                classAutoloader
            ),
            globalNamespace = namespaceFactory.create(),
            globalScope,
            globalsSuperGlobal = superGlobalScope.defineVariable('GLOBALS');

        scopeFactory.setClosureFactory(closureFactory);
        globalScope = scopeFactory.create(globalNamespace);
        scopeFactory.setGlobalScope(globalScope);
        classAutoloader.setGlobalNamespace(globalNamespace);
        valueFactory.setGlobalNamespace(globalNamespace);

        // Set up the $GLOBALS superglobal
        globalsSuperGlobal.setReference(
            referenceFactory.createAccessor(
                function () {
                    var globalValues = globalScope.exportVariables(),
                        globalsArray = valueFactory.coerce(globalValues);

                    // $GLOBALS should have a recursive reference to itself
                    globalsArray.getElementByKey(valueFactory.createString('GLOBALS'))
                        .setValue(globalsArray);

                    return globalsArray;
                },
                function (newNative) {
                    // Clear these accessors first
                    globalsSuperGlobal.unset();

                    globalsSuperGlobal.setValue(valueFactory.coerce(newNative));
                }
            )
        );

        this.callStack = callStack;
        this.globalNamespace = globalNamespace;
        this.globalScope = globalScope;
        this.iniState = new INIState();
        this.optionSet = optionSet;
        this.referenceFactory = referenceFactory;
        this.callStack = callStack;
        this.classAutoloader = classAutoloader;
        this.pausable = pausable;
        this.stderr = stderr;
        this.stdin = stdin;
        this.stdout = stdout;
        this.superGlobalScope = superGlobalScope;
        this.valueFactory = valueFactory;
        this.PHPException = null;

        setUpState(this, installedBuiltinTypes);
    }

    _.extend(PHPState.prototype, {
        defineSuperGlobal: function (name, value) {
            this.superGlobalScope.defineVariable(name).setValue(value);
        },

        defineSuperGlobalAccessor: function (name, valueGetter, valueSetter) {
            var state = this,
                accessorReference = new AccessorReference(state.valueFactory, valueGetter, valueSetter);

            state.superGlobalScope.defineVariable(name).setReference(accessorReference);
        },

        getCallStack: function () {
            return this.callStack;
        },

        getConstant: function (name) {
            var value;

            try {
                value = this.globalNamespace.getConstant(name, true);
            } catch (error) {
                return null;
            }

            return value.getNative();
        },

        getGlobalNamespace: function () {
            return this.globalNamespace;
        },

        getGlobalScope: function () {
            return this.globalScope;
        },

        getOptions: function () {
            return this.optionSet.getOptions();
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

        getSuperGlobalScope: function () {
            return this.superGlobalScope;
        },

        getValueFactory: function () {
            return this.valueFactory;
        }
    });

    return PHPState;
}, {strict: true});
