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
    require('./Function/ClosureContext'),
    require('./ClosureFactory'),
    require('./Reference/Element/ElementProviderFactory'),
    require('./Error/ErrorConfiguration'),
    require('./Error/ErrorConverter'),
    require('./Error/ErrorPromoter'),
    require('./Error/ErrorReporting'),
    require('./FFI/Call'),
    require('./Function/FunctionContext'),
    require('./FunctionFactory'),
    require('./Function/FunctionSpec'),
    require('./Function/FunctionSpecFactory'),
    require('./INIState'),
    require('./Loader'),
    require('./LoadScope'),
    require('./Function/MethodContext'),
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
    require('./Function/Parameter'),
    require('./Function/ParameterFactory'),
    require('./Function/ParameterListFactory'),
    require('./Function/ParameterTypeFactory'),
    require('./ReferenceFactory'),
    require('./Scope'),
    require('./ScopeFactory'),
    require('./Output/StdoutBuffer'),
    require('./SuperGlobalScope'),
    require('./Error/TraceFormatter'),
    require('./Type/TypeFactory'),
    require('./Value'),
    require('./ValueFactory'),
    require('./Variable'),
    require('./VariableFactory')
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
    ClosureContext,
    ClosureFactory,
    ElementProviderFactory,
    ErrorConfiguration,
    ErrorConverter,
    ErrorPromoter,
    ErrorReporting,
    FFICall,
    FunctionContext,
    FunctionFactory,
    FunctionSpec,
    FunctionSpecFactory,
    INIState,
    Loader,
    LoadScope,
    MethodContext,
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
    Parameter,
    ParameterFactory,
    ParameterListFactory,
    ParameterTypeFactory,
    ReferenceFactory,
    Scope,
    ScopeFactory,
    StdoutBuffer,
    SuperGlobalScope,
    TraceFormatter,
    TypeFactory,
    Value,
    ValueFactory,
    Variable,
    VariableFactory
) {
    var THROWABLE_INTERFACE = 'Throwable',
        hasOwn = {}.hasOwnProperty,
        setUpState = function (state, installedBuiltinTypes, optionGroups) {
            var globalNamespace = state.globalNamespace;

            /**
             * Bindings allow components of an addon to share data.
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
                var groupBuiltins = groupFactory(state.internals),
                    functionAliases = {};

                _.each(groupBuiltins, function (fn, name) {
                    if (typeof fn === 'function') {
                        globalNamespace.defineFunction(name, fn, state.globalNamespaceScope);
                    } else {
                        // Gather function aliases (strings) and install the aliases at the end
                        // (see below), to ensure that the original functions exist first
                        // as an alias can only be installed using an existing function's FunctionSpec
                        functionAliases[name] = fn;
                    }
                });

                _.forOwn(functionAliases, function (originalName, aliasName) {
                    globalNamespace.aliasFunction(originalName, aliasName);
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
             * Installs a set of defaults for INI options
             *
             * @param {Function} groupFactory
             */
            function installDefaultINIOptionGroup(groupFactory) {
                var groupBuiltins = groupFactory(state.internals);

                _.each(groupBuiltins, function (value, name) {
                    state.iniState.set(name, value);
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

            /**
             * Installs a set of translations for one or more locales
             *
             * @param {object} cataloguesByLocale
             */
            function installTranslationCatalogues(cataloguesByLocale) {
                state.translator.addTranslations(cataloguesByLocale);
            }

            // Core builtins
            _.each(builtinTypes.translationCatalogues, installTranslationCatalogues);
            _.each(builtinTypes.constantGroups, installConstantGroup);
            _.each(builtinTypes.defaultINIGroups, installDefaultINIOptionGroup);
            _.each(builtinTypes.functionGroups, installFunctionGroup);
            _.each(builtinTypes.classGroups, installClassGroup);

            if (_.isArray(builtinTypes.classes)) {
                // Allow the class set to be an array, for grouping classes
                // so that they will load in a specific order (ie. when handling dependencies between them)
                _.each(builtinTypes.classes, function (classes) {
                    _.forOwn(classes, installClass);
                });
            } else {
                _.forOwn(builtinTypes.classes, installClass);
            }

            // Optional installed builtins
            _.each(optionGroups, installOptionGroup);
            state.bindings = {};
            _.each(installedBuiltinTypes.translationCatalogues, installTranslationCatalogues);
            _.each(installedBuiltinTypes.constantGroups, installConstantGroup);
            _.each(installedBuiltinTypes.defaultINIGroups, installDefaultINIOptionGroup);
            _.each(installedBuiltinTypes.bindingGroups, installBindingGroup);
            // TODO: Add "exposures" for addons to expose things to transpiled code
            // TODO: Add "externals" for addons to expose things to external code (eg. engine.getExternal(...))?
            _.each(installedBuiltinTypes.functionGroups, installFunctionGroup);
            _.each(installedBuiltinTypes.classGroups, installClassGroup);
            _.forOwn(installedBuiltinTypes.classes, installClass);
        },
        Exception = phpCommon.Exception,
        Translator = phpCommon.Translator;

    function PHPState(runtime, installedBuiltinTypes, stdin, stdout, stderr, pausable, mode, optionGroups, options) {
        var callFactory = new CallFactory(Call, FFICall),
            elementProviderFactory = new ElementProviderFactory(),
            elementProvider = elementProviderFactory.createProvider(),
            moduleFactory = new ModuleFactory(Module),
            translator = new Translator(),
            iniState = new INIState(),
            getConstant = this.getConstant.bind(this),
            errorConfiguration = new ErrorConfiguration(iniState),
            errorConverter = new ErrorConverter(getConstant),
            traceFormatter = new TraceFormatter(translator),
            errorReporting = new ErrorReporting(
                errorConfiguration,
                errorConverter,
                traceFormatter,
                translator,
                stdout,
                stderr
            ),
            errorPromoter = new ErrorPromoter(errorReporting),
            valueFactory = new ValueFactory(pausable, mode, elementProvider, translator, callFactory, errorPromoter),
            callStack = new CallStack(valueFactory, translator, errorReporting, stderr),
            referenceFactory = new ReferenceFactory(
                AccessorReference,
                NullReference,
                valueFactory
            ),
            classAutoloader = new ClassAutoloader(valueFactory),
            superGlobalScope = new SuperGlobalScope(callStack, valueFactory),
            variableFactory = new VariableFactory(Variable, callStack, valueFactory),
            typeFactory = new TypeFactory(),
            parameterFactory = new ParameterFactory(Parameter, callStack, translator),
            parameterTypeFactory = new ParameterTypeFactory(typeFactory),
            parameterListFactory = new ParameterListFactory(parameterFactory, parameterTypeFactory),
            functionSpecFactory = new FunctionSpecFactory(
                FunctionSpec,
                FunctionContext,
                MethodContext,
                ClosureContext,
                callStack,
                parameterListFactory,
                valueFactory
            ),
            scopeFactory = new ScopeFactory(
                LoadScope,
                Scope,
                NamespaceScope,
                callStack,
                translator,
                superGlobalScope,
                functionSpecFactory,
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
                functionSpecFactory,
                valueFactory,
                classAutoloader
            ),
            globalNamespace = namespaceFactory.create(),
            // The global/default module (not eg. the same as the command line module)
            globalModule = moduleFactory.create(null),
            // "Invisible" global namespace scope, not defined by any code
            globalNamespaceScope = new NamespaceScope(
                globalNamespace,
                valueFactory,
                callStack,
                globalModule,
                globalNamespace,
                true
            ),
            globalScope,
            globalsSuperGlobal = superGlobalScope.defineVariable('GLOBALS'),
            state = this;

        scopeFactory.setClosureFactory(closureFactory);
        globalScope = scopeFactory.create();
        scopeFactory.setGlobalScope(globalScope);
        classAutoloader.setGlobalNamespace(globalNamespace);
        valueFactory.setCallStack(callStack);
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
                        .setReference(globalsSuperGlobal.getReference());

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
        this.errorReporting = errorReporting;
        this.globalNamespace = globalNamespace;
        this.globalNamespaceScope = globalNamespaceScope;
        this.globalScope = globalScope;
        this.iniState = iniState;
        this.options = options;
        this.optionSet = new OptionSet(options);
        this.output = new Output(new OutputFactory(OutputBuffer), new StdoutBuffer(stdout));
        this.internals = {
            callFactory: callFactory,
            callStack: callStack,
            classAutoloader: classAutoloader,
            errorConfiguration: errorConfiguration,
            errorPromoter: errorPromoter,
            errorReporting: errorReporting,
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
            getConstant: getConstant,
            getGlobal: this.getGlobal.bind(this),
            globalNamespace: globalNamespace,
            globalScope: globalScope,
            iniState: this.iniState,
            mode: mode,
            optionSet: this.optionSet,
            output: this.output,
            pausable: pausable,
            runtime: runtime,
            setGlobal: this.setGlobal.bind(this),
            stdout: stdout,
            traceFormatter: traceFormatter,
            translator: translator,
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
        this.translator = translator;
        this.valueFactory = valueFactory;
        this.Throwable = null;

        setUpState(this, installedBuiltinTypes, optionGroups || []);

        // Set any INI options provided
        _.forOwn(options.ini, function (value, name) {
            iniState.set(name, value);
        });
    }

    _.extend(PHPState.prototype, {
        /**
         * Defines the given alias for the given function
         *
         * @param {string} originalName
         * @param {string} aliasName
         */
        aliasFunction: function (originalName, aliasName) {
            this.globalNamespace.aliasFunction(originalName, aliasName);
        },

        /**
         * Defines a new class (in any namespace)
         *
         * @param {string} fqcn FQCN of the class to define
         * @param {function} definitionFactory Called with `internals` object, returns the class definition
         * @returns {Class} Returns the instance of Class that represents a PHP class
         */
        defineClass: function (fqcn, definitionFactory) {
            var state = this,
                definedInterfaceNames = [],
                definedUnwrapper = null,
                enableAutoCoercion = true,
                name,
                superClass = null,
                Class = definitionFactory(_.extend({}, state.internals, {
                    /**
                     * Calls the constructor for the superclass of this class, if this class extends another
                     *
                     * @param {ObjectValue|object} instance Unwrapped or wrapped instance (see below)
                     * @param {Value[]|*[]} args Arguments (Value objects if non-coercing, native if coercing)
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
                    },
                    /**
                     * Implements an interface
                     *
                     * @param {string} interfaceName
                     */
                    implement: function (interfaceName) {
                        definedInterfaceNames.push(interfaceName);
                    }
                })),
                classObject,
                namespace = state.globalNamespace,
                parsed = state.globalNamespace.parseName(fqcn);

            if (superClass) {
                Class.superClass = superClass;
            }

            // Add any new interfaces to implement to the class definition
            if (!Class.interfaces) {
                Class.interfaces = [];
            }
            [].push.apply(Class.interfaces, definedInterfaceNames);

            if (name === THROWABLE_INTERFACE) {
                if (state.Throwable) {
                    throw new Error('PHPState.defineClass(...) :: Throwable interface is already defined');
                }
                state.Throwable = Class;
            }

            namespace = parsed.namespace;
            name = parsed.name;

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
            var state = this,
                parsed = state.globalNamespace.parseName(name);

            parsed.namespace.defineFunction(parsed.name, function () {
                // Unwrap args from PHP-land to JS-land to native values
                var args = _.map(arguments, function (argReference) {
                    return argReference.getNative();
                });

                // Call the native function, wrapping its return value as a PHP value
                return state.valueFactory.coerce(fn.apply(null, args));
            }, state.globalNamespaceScope);
        },

        /**
         * Defines a constant with the given native value
         *
         * @param {string} name
         * @param {*} nativeValue
         * @param {object} options
         */
        defineConstant: function (name, nativeValue, options) {
            var state = this,
                parsed = state.globalNamespace.parseName(name),
                value = state.valueFactory.coerce(nativeValue);

            parsed.namespace.defineConstant(parsed.name, value, options);
        },

        /**
         * Defines a global variable and gives it the provided value,
         * if not already defined. If the variable is already defined
         * in this scope then an error will be thrown
         *
         * @param {string} name
         * @param {Value|*} value Value object or native value to be coerced
         * @throws {Error} Throws when the global scope already defines the specified variable
         */
        defineGlobal: function (name, value) {
            var state = this;

            if (state.globalScope.hasVariable(name)) {
                throw new Error(
                    'PHPState.defineGlobal() :: Variable "' + name + '" is already defined in the global scope'
                );
            }

            state.globalScope.defineVariable(name).setValue(state.valueFactory.coerce(value));
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
         * Defines a global function from a native JS one. If a fully-qualified name is provided
         * with a namespace prefix, eg. `My\Lib\MyFunc` then it will be defined in the specified namespace
         *
         * @param {string} name
         * @param {Function} fn
         */
        defineNonCoercingFunction: function (name, fn) {
            var state = this,
                parsed = state.globalNamespace.parseName(name);

            parsed.namespace.defineFunction(parsed.name, function () {
                // Call the native function, wrapping its return value as a PHP value
                return state.valueFactory.coerce(fn.apply(null, arguments));
            }, state.globalNamespaceScope);
        },

        /**
         * Defines a super global variable (available in all scopes implicitly,
         * unlike a normal global which is not available unless imported with a `global` statement)
         * and gives it the provided value. If a native value is given then it will be coerced to a PHP one.
         *
         * @param {string} name
         * @param {Value|*} value
         */
        defineSuperGlobal: function (name, value) {
            var state = this;

            state.superGlobalScope
                .defineVariable(name)
                .setValue(state.valueFactory.coerce(value));
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
         * Fetches the specified binding from an installed addon
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

        /**
         * Fetches the ErrorReporting service
         *
         * @returns {ErrorReporting}
         */
        getErrorReporting: function () {
            return this.errorReporting;
        },

        /**
         * Fetches either a global function or one in a namespace
         *
         * @param {string} name FQCN of the function to fetch
         * @return {Function}
         */
        getFunction: function (name) {
            var parsed = this.globalNamespace.parseName(name);

            return parsed.namespace.getFunction(parsed.name);
        },

        /**
         * Fetches the value of a global variable, if defined.
         * If the variable is not defined then a NULL value will be returned.
         *
         * @param {string} name
         * @return {Value}
         */
        getGlobal: function (name) {
            return this.globalScope.getVariable(name).getValueOrNull();
        },

        getGlobalNamespace: function () {
            return this.globalNamespace;
        },

        getGlobalScope: function () {
            return this.globalScope;
        },

        /**
         * Fetches the native value of an INI option
         *
         * @param {string} name
         * @returns {*}
         */
        getINIOption: function (name) {
            return this.iniState.get(name);
        },

        /**
         * Fetches the Loader for the runtime state, used for include/require and eval(...)
         *
         * @returns {Loader}
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
         * @returns {Output}
         */
        getOutput: function () {
            return this.output;
        },

        /**
         * Fetches the ReferenceFactory service
         *
         * @returns {ReferenceFactory}
         */
        getReferenceFactory: function () {
            return this.referenceFactory;
        },

        /**
         * Fetches the ScopeFactory for the runtime state
         *
         * @returns {ScopeFactory}
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

        /**
         * Fetches the Translator service
         *
         * @returns {Translator}
         */
        getTranslator: function () {
            return this.translator;
        },

        getValueFactory: function () {
            return this.valueFactory;
        },

        /**
         * Sets the value of an existing PHP global. If a native value is given
         * then it will be coerced to a PHP one.
         * If the global is not defined than an error will be thrown -
         * use .defineGlobal(...) when defining a new variable
         *
         * @param {string} name
         * @param {Value|*} value Value object or native value to be coerced
         * @throws {Error} Throws if the variable is not defined in the global scope
         */
        setGlobal: function (name, value) {
            var state = this;

            if (!state.globalScope.hasVariable(name)) {
                throw new Error(
                    'PHPState.setGlobal() :: Variable "' + name + '" is not defined in the global scope'
                );
            }

            state.globalScope.getVariable(name).setValue(state.valueFactory.coerce(value));
        }
    });

    return PHPState;
}, {strict: true});
