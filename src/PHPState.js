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
    require('./MethodSpec'),
    require('./Module'),
    require('./ModuleFactory'),
    require('./Namespace'),
    require('./NamespaceFactory'),
    require('./NamespaceScope'),
    require('./Reference/Null'),
    require('./ReferenceFactory'),
    require('./Scope'),
    require('./ScopeFactory'),
    require('./SuperGlobalScope'),
    require('./Value'),
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
    MethodSpec,
    Module,
    ModuleFactory,
    Namespace,
    NamespaceFactory,
    NamespaceScope,
    NullReference,
    ReferenceFactory,
    Scope,
    ScopeFactory,
    SuperGlobalScope,
    Value,
    ValueFactory,
    VariableReference
) {
    var EXCEPTION_CLASS = 'Exception',
        setUpState = function (state, installedBuiltinTypes) {
            var globalNamespace = state.globalNamespace;

            function installFunctionGroup(groupFactory) {
                var groupBuiltins = groupFactory(state.internals);

                _.each(groupBuiltins, function (fn, name) {
                    globalNamespace.defineFunction(name, fn);
                });
            }

            function installClass(definitionFactory, name) {
                state.defineClass(name, definitionFactory);
            }

            function installConstantGroup(groupFactory) {
                var groupBuiltins = groupFactory(state.internals);

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
            moduleFactory = new ModuleFactory(Module),
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
            functionFactory = new FunctionFactory(MethodSpec, scopeFactory, callFactory, valueFactory, callStack),
            closureFactory = new ClosureFactory(functionFactory, valueFactory, callStack, Closure),
            namespaceFactory = new NamespaceFactory(
                Namespace,
                callStack,
                functionFactory,
                valueFactory,
                classAutoloader
            ),
            globalNamespace = namespaceFactory.create(),
            // The global/default module (not eg. the same as the command line module)
            globalModule = moduleFactory.create(null),
            // "Invisible" global namespace scope, not defined by any code
            globalNamespaceScope = new NamespaceScope(globalNamespace, valueFactory, globalModule, globalNamespace),
            globalScope,
            globalsSuperGlobal = superGlobalScope.defineVariable('GLOBALS');

        scopeFactory.setClosureFactory(closureFactory);
        globalScope = scopeFactory.create(globalNamespaceScope);
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

        this.callFactory = callFactory;
        this.callStack = callStack;
        this.globalNamespace = globalNamespace;
        this.globalNamespaceScope = globalNamespaceScope;
        this.globalScope = globalScope;
        this.iniState = new INIState();
        this.internals = {
            callStack: callStack,
            classAutoloader: classAutoloader,
            globalNamespace: globalNamespace,
            iniState: this.iniState,
            optionSet: optionSet,
            pausable: pausable,
            stdout: stdout,
            valueFactory: valueFactory
        };
        this.moduleFactory = moduleFactory;
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
        /**
         * Defines a new class (in any namespace)
         *
         * @param {string} name FQCN of the class to define
         * @param {function} definitionFactory Called with `internals` object, returns the class definition
         * @returns {Class} Returns the instance of Class that represents a PHP class
         */
        defineClass: function (name, definitionFactory) {
            var state = this,
                definedUnwrapper = null,
                enableAutoCoercion = true,
                Class = definitionFactory(_.extend({}, state.internals, {
                    defineUnwrapper: function (unwrapper) {
                        definedUnwrapper = unwrapper;
                    },
                    disableAutoCoercion: function () {
                        enableAutoCoercion = false;
                    }
                })),
                classObject,
                namespace = state.globalNamespace,
                parsed = state.globalNamespace.parseClassName(name);

            if (name === EXCEPTION_CLASS) {
                if (state.PHPException) {
                    throw new Error('PHPState.defineClass(...) :: Exception class is already defined');
                }

                state.PHPException = Class;
            }

            if (parsed) {
                namespace = parsed.namespace;
                name = parsed.name;
            }

            classObject = namespace.defineClass(name, Class, state.globalNamespaceScope);

            if (definedUnwrapper) {
                // Custom unwrappers may be used to eg. unwrap a PHP \DateTime object to a JS Date object
                classObject.defineUnwrapper(definedUnwrapper);
            }

            if (enableAutoCoercion) {
                classObject.enableAutoCoercion();
            }

            return classObject;
        },

        defineSuperGlobal: function (name, value) {
            this.superGlobalScope.defineVariable(name).setValue(value);
        },

        defineSuperGlobalAccessor: function (name, valueGetter, valueSetter) {
            var state = this,
                accessorReference = new AccessorReference(state.valueFactory, valueGetter, valueSetter);

            state.superGlobalScope.defineVariable(name).setReference(accessorReference);
        },

        getCallFactory: function () {
            return this.callFactory;
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

        getModuleFactory: function () {
            return this.moduleFactory;
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
