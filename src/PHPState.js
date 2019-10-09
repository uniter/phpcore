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
    require('phpcommon'),
    require('util'),
    require('./Reference/AccessorReference'),
    require('./Call'),
    require('./CallFactory'),
    require('./CallStack'),
    require('./ClassAutoloader'),
    require('./Closure'),
    require('./ClosureFactory'),
    require('./Reference/Element/ElementProviderFactory'),
    require('./FunctionFactory'),
    require('./INIState'),
    require('./Loader'),
    require('./MethodSpec'),
    require('./Module'),
    require('./ModuleFactory'),
    require('./Namespace'),
    require('./NamespaceFactory'),
    require('./NamespaceScope'),
    require('./Reference/Null'),
    require('./OptionSet'),
    require('./Output/Output'),
    require('./Output/OutputBuffer'),
    require('./Output/OutputFactory'),
    require('./ReferenceFactory'),
    require('./Scope'),
    require('./ScopeFactory'),
    require('./Output/StdoutBuffer'),
    require('./SuperGlobalScope'),
    require('./Value'),
    require('./ValueFactory'),
    require('./Variable'),
    require('./VariableFactory'),
    require('./Reference/Variable')
], function (
    _,
    builtinTypes,
    phpCommon,
    util,
    AccessorReference,
    Call,
    CallFactory,
    CallStack,
    ClassAutoloader,
    Closure,
    ClosureFactory,
    ElementProviderFactory,
    FunctionFactory,
    INIState,
    Loader,
    MethodSpec,
    Module,
    ModuleFactory,
    Namespace,
    NamespaceFactory,
    NamespaceScope,
    NullReference,
    OptionSet,
    Output,
    OutputBuffer,
    OutputFactory,
    ReferenceFactory,
    Scope,
    ScopeFactory,
    StdoutBuffer,
    SuperGlobalScope,
    Value,
    ValueFactory,
    Variable,
    VariableFactory,
    VariableReference
) {
    var EXCEPTION_CLASS = 'Exception',
        hasOwn = {}.hasOwnProperty,
        setUpState = function (state, installedBuiltinTypes, optionGroups) {
            var globalNamespace = state.globalNamespace;

            /**
             * Bindings allow components of a plugin to share data.
             *
             * @param {Function} groupFactory
             */
            function installBindingGroup(groupFactory) {
                var groupBindings = groupFactory(state.internals);

                _.each(groupBindings, function (bindingFactory, bindingName) {
                    var bindingOptions = state.optionSet.getOption(bindingName);

                    state.bindings[bindingName] = bindingFactory(bindingOptions);
                });
            }

            /**
             * Installs a set of related functions into PHP-land
             *
             * @param {Function} groupFactory
             */
            function installFunctionGroup(groupFactory) {
                var groupBuiltins = groupFactory(state.internals);

                _.each(groupBuiltins, function (fn, name) {
                    globalNamespace.defineFunction(name, fn);
                });
            }

            /**
             * Installs a single class into PHP-land
             *
             * @param {Function} definitionFactory
             * @param {string} name
             */
            function installClass(definitionFactory, name) {
                state.defineClass(name, definitionFactory);
            }

            /**
             * Installs a set of related classes into PHP-land
             *
             * @param {Function} groupFactory
             */
            function installClassGroup(groupFactory) {
                var groupBuiltins = groupFactory(state.internals);

                _.each(groupBuiltins, function (definitionFactory, name) {
                    state.defineClass(name, definitionFactory);
                });
            }

            /**
             * Installs a set of related constants into PHP-land
             *
             * @param {Function} groupFactory
             */
            function installConstantGroup(groupFactory) {
                var groupBuiltins = groupFactory(state.internals);

                _.each(groupBuiltins, function (value, name) {
                    globalNamespace.defineConstant(name, state.valueFactory.coerce(value));
                });
            }

            /**
             * Installs a set of related runtime options
             *
             * @param {Function} groupFactory
             */
            function installOptionGroup(groupFactory) {
                var groupOptions = groupFactory(state.internals);

                _.extend(state.options, groupOptions);
            }

            // Core builtins
            _.each(builtinTypes.constantGroups, installConstantGroup);
            _.each(builtinTypes.functionGroups, installFunctionGroup);
            _.each(builtinTypes.classGroups, installClassGroup);
            _.forOwn(builtinTypes.classes, installClass);

            // Optional installed builtins
            _.each(optionGroups, installOptionGroup);
            state.bindings = {};
            _.each(installedBuiltinTypes.constantGroups, installConstantGroup);
            _.each(installedBuiltinTypes.bindingGroups, installBindingGroup);
            _.each(installedBuiltinTypes.functionGroups, installFunctionGroup);
            _.each(installedBuiltinTypes.classGroups, installClassGroup);
            _.forOwn(installedBuiltinTypes.classes, installClass);
        },
        Exception = phpCommon.Exception;

    function PHPState(runtime, installedBuiltinTypes, stdin, stdout, stderr, pausable, mode, optionGroups, options) {
        var callStack = new CallStack(stderr),
            callFactory = new CallFactory(Call),
            elementProviderFactory = new ElementProviderFactory(),
            elementProvider = elementProviderFactory.createProvider(),
            moduleFactory = new ModuleFactory(Module),
            valueFactory = new ValueFactory(pausable, mode, callStack, elementProvider),
            referenceFactory = new ReferenceFactory(
                AccessorReference,
                NullReference,
                VariableReference,
                valueFactory
            ),
            classAutoloader = new ClassAutoloader(valueFactory),
            superGlobalScope = new SuperGlobalScope(callStack, valueFactory),
            variableFactory = new VariableFactory(Variable, callStack, valueFactory),
            scopeFactory = new ScopeFactory(
                Scope,
                NamespaceScope,
                callStack,
                superGlobalScope,
                valueFactory,
                variableFactory,
                referenceFactory
            ),
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
            globalsSuperGlobal = superGlobalScope.defineVariable('GLOBALS'),
            state = this;

        scopeFactory.setClosureFactory(closureFactory);
        globalScope = scopeFactory.create(globalNamespaceScope);
        scopeFactory.setGlobalScope(globalScope);
        classAutoloader.setGlobalNamespace(globalNamespace);
        valueFactory.setGlobalNamespace(globalNamespace);

        // Set up the $GLOBALS superglobal
        globalsSuperGlobal.setReference(
            referenceFactory.createAccessor(
                function () {
                    var globalsArray,
                        globalValues = globalScope.exportVariables(),
                        elementHookCollection = elementProviderFactory.createElementHookCollection(),
                        hookableElementProvider = elementProviderFactory.createHookableProvider(
                            elementProvider,
                            elementHookCollection
                        );

                    // Use a hookable array for $GLOBALS, so that we do not take a performance hit
                    // for normal non-$GLOBALS arrays, as we would if we added hooking to all of them
                    // without using the decorator pattern
                    globalsArray = valueFactory.createArray(globalValues, hookableElementProvider);

                    // $GLOBALS should have a recursive reference to itself
                    globalsArray.getElementByKey(valueFactory.createString('GLOBALS'))
                        .setReference(referenceFactory.createVariable(globalsSuperGlobal));

                    // Install hooks to ensure that modifications to the $GLOBALS array
                    // are reflected in the corresponding global variables
                    elementHookCollection.onElementReferenceSet(function (elementReference, referenceSet) {
                        var globalVariableName = elementReference.getKey().getNative();

                        globalScope.getVariable(globalVariableName).setReference(referenceSet);
                    });
                    elementHookCollection.onElementValueSet(function (elementReference, valueSet) {
                        var globalVariableName = elementReference.getKey().getNative();

                        globalScope.getVariable(globalVariableName).setValue(valueSet);
                    });
                    elementHookCollection.onElementUnset(function (elementReference) {
                        var globalVariableName = elementReference.getKey().getNative();

                        globalScope.getVariable(globalVariableName).unset();
                    });

                    return globalsArray;
                },
                function (newNative) {
                    // Clear these accessors first
                    globalsSuperGlobal.unset();

                    globalsSuperGlobal.setValue(valueFactory.coerce(newNative));
                }
            )
        );

        // Make a copy of the options object so we don't mutate it
        options = _.extend({}, options || {});

        this.bindings = null;
        this.callFactory = callFactory;
        this.callStack = callStack;
        this.globalNamespace = globalNamespace;
        this.globalNamespaceScope = globalNamespaceScope;
        this.globalScope = globalScope;
        this.iniState = new INIState();
        this.options = options;
        this.optionSet = new OptionSet(options);
        this.output = new Output(new OutputFactory(OutputBuffer), new StdoutBuffer(stdout));
        this.internals = {
            callStack: callStack,
            classAutoloader: classAutoloader,
            getBinding: function (bindingName) {
                if (state.bindings === null) {
                    // Option groups are loaded before bindings, so if any of them attempt to access a binding
                    // too early then throw a meaningful error message
                    throw new Exception('Option groups cannot access bindings too early');
                }

                if (!hasOwn.call(state.bindings, bindingName)) {
                    throw new Exception('No binding is defined with name "' + bindingName + '"');
                }

                return state.bindings[bindingName];
            }.bind(this),
            getConstant: this.getConstant.bind(this),
            globalNamespace: globalNamespace,
            iniState: this.iniState,
            mode: mode,
            optionSet: this.optionSet,
            output: this.output,
            pausable: pausable,
            runtime: runtime,
            stdout: stdout,
            valueFactory: valueFactory
        };
        this.loader = new Loader(valueFactory, pausable);
        this.moduleFactory = moduleFactory;
        this.referenceFactory = referenceFactory;
        this.scopeFactory = scopeFactory;
        this.callStack = callStack;
        this.classAutoloader = classAutoloader;
        this.pausable = pausable;
        this.stderr = stderr;
        this.stdin = stdin;
        this.stdout = stdout;
        this.superGlobalScope = superGlobalScope;
        this.valueFactory = valueFactory;
        this.PHPException = null;

        setUpState(this, installedBuiltinTypes, optionGroups || []);
    }

    _.extend(PHPState.prototype, {
        /**
         * Defines a new class (in any namespace)
         *
         * @param {string} fqcn FQCN of the class to define
         * @param {function} definitionFactory Called with `internals` object, returns the class definition
         * @returns {Class} Returns the instance of Class that represents a PHP class
         */
        defineClass: function (fqcn, definitionFactory) {
            var state = this,
                definedUnwrapper = null,
                enableAutoCoercion = true,
                name,
                superClass = null,
                Class = definitionFactory(_.extend({}, state.internals, {
                    /**
                     * Calls the constructor for the superclass of this class, if this class extends another
                     *
                     * @param {ObjectValue|object} instance Unwrapped or wrapped instance (see below)
                     * @param {Value[]} args Arguments
                     */
                    callSuperConstructor: function (instance, args) {
                        var argValues,
                            instanceValue;

                        if (!superClass) {
                            throw new Exception(
                                'Cannot call superconstructor: no superclass is defined for class "' + fqcn + '"'
                            );
                        }

                        /*
                         * If the class is in auto-coercing mode, `instance` will be the native
                         * object value. If the class is in non-coercing mode, `instance` will be
                         * an ObjectValue wrapping the instance, so we need to coerce what we are passed
                         * to make sure it is an ObjectValue as expected by Class.prototype.construct(...).
                         * The same applies to the arguments list.
                         */
                        if (enableAutoCoercion) {
                            instanceValue = state.valueFactory.coerce(instance);

                            argValues = _.map(args, function (nativeArg) {
                                return state.valueFactory.coerce(nativeArg);
                            });
                        } else {
                            instanceValue = instance;
                            argValues = args;
                        }

                        superClass.construct(instanceValue, argValues);
                    },
                    defineUnwrapper: function (unwrapper) {
                        definedUnwrapper = unwrapper;
                    },
                    disableAutoCoercion: function () {
                        enableAutoCoercion = false;
                    },
                    /**
                     * Extends another defined class
                     *
                     * @param {string} fqcn
                     */
                    extendClass: function (fqcn) {
                        superClass = state.globalNamespace.getClass(fqcn);
                    }
                })),
                classObject,
                namespace = state.globalNamespace,
                parsed = state.globalNamespace.parseClassName(fqcn);

            if (superClass) {
                Class.superClass = superClass;
            }

            if (fqcn === EXCEPTION_CLASS) {
                if (state.PHPException) {
                    throw new Exception('PHPState.defineClass(...) :: Exception class is already defined');
                }

                state.PHPException = Class;
            }

            if (parsed) {
                namespace = parsed.namespace;
                name = parsed.name;
            } else {
                name = fqcn;
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

        /**
         * Defines a global function from a native JS one. If a fully-qualified name is provided
         * with a namespace prefix, eg. `My\Lib\MyFunc` then it will be defined in the specified namespace
         *
         * @param {string} name
         * @param {Function} fn
         */
        defineCoercingFunction: function (name, fn) {
            var state = this;

            this.globalNamespace.defineFunction(name, function () {
                // Unwrap args from PHP-land to JS-land to native values
                var args = _.map(arguments, function (argReference) {
                    return argReference.getNative();
                });

                // Call the native function, wrapping its return value as a PHP value
                return state.valueFactory.coerce(fn.apply(null, args));
            });
        },

        /**
         * Defines a global variable and gives it the provided value
         *
         * @param {string} name
         * @param {Value} value
         */
        defineGlobal: function (name, value) {
            this.globalScope.defineVariable(name).setValue(value);
        },

        /**
         * Defines a global variable using a getter/setter pair
         *
         * @param {string} name
         * @param {Function} valueGetter
         * @param {Function} valueSetter
         */
        defineGlobalAccessor: function (name, valueGetter, valueSetter) {
            var state = this,
                accessorReference = state.referenceFactory.createAccessor(valueGetter, valueSetter);

            state.globalScope.defineVariable(name).setReference(accessorReference);
        },

        /**
         * Defines a super global variable (available in all scopes implicitly,
         * unlike a normal global which is not available unless imported with a `global` statement)
         * and gives it the provided value
         *
         * @param {string} name
         * @param {Value} value
         */
        defineSuperGlobal: function (name, value) {
            this.superGlobalScope.defineVariable(name).setValue(value);
        },

        /**
         * Defines a super global variable (see above) using a getter/setter pair
         *
         * @param {string} name
         * @param {Function} valueGetter
         * @param {Function} valueSetter
         */
        defineSuperGlobalAccessor: function (name, valueGetter, valueSetter) {
            var state = this,
                accessorReference = state.referenceFactory.createAccessor(valueGetter, valueSetter);

            state.superGlobalScope.defineVariable(name).setReference(accessorReference);
        },

        /**
         * Fetches the specified binding from an installed plugin
         *
         * @param {string} bindingName
         * @returns {*}
         */
        getBinding: function (bindingName) {
            var state = this;

            return hasOwn.call(state.bindings, bindingName) ? state.bindings[bindingName] : null;
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

        /**
         * Fetches the Loader for the runtime state, used for include/require and eval(...)
         *
         * @return {Loader}
         */
        getLoader: function () {
            return this.loader;
        },

        getModuleFactory: function () {
            return this.moduleFactory;
        },

        getOptions: function () {
            return this.optionSet.getOptions();
        },

        /**
         * Fetches the Output service for the runtime state, used for handling buffering and writing to standard out
         *
         * @return {Output}
         */
        getOutput: function () {
            return this.output;
        },

        getPHPExceptionClass: function () {
            return this.PHPException;
        },

        getReferenceFactory: function () {
            return this.referenceFactory;
        },

        /**
         * Fetches the ScopeFactory for the runtime state
         *
         * @return {ScopeFactory}
         */
        getScopeFactory: function () {
            return this.scopeFactory;
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
