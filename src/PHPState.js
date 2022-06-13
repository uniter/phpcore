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
    require('./Reference/AccessorReference'),
    require('./CallStack'),
    require('./ClassAutoloader'),
    require('./Class/ClassDefiner'),
    require('./Class/ClassFactory'),
    require('./Class/ClassPromoter'),
    require('./Closure'),
    require('./Function/ClosureContext'),
    require('./ClosureFactory'),
    require('./Service/Container'),
    require('./Control/ControlFactory'),
    require('./Core/Core'),
    require('./Core/CoreBinder'),
    require('./Core/CoreFactory'),
    require('./Reference/Element/ElementProviderFactory'),
    require('./Reference/Element'),
    require('./Engine/EngineScope'),
    require('./Error/ErrorConfiguration'),
    require('./Error/ErrorConverter'),
    require('./Error/ErrorPromoter'),
    require('./Error/ErrorReporting'),
    require('./Load/Evaluator'),
    require('./FFI/Value/AsyncObjectValue'),
    require('./FFI/Call/Caller'),
    require('./FFI/Internals/ClassInternalsClassFactory'),
    require('./FFI/Export/ExportFactory'),
    require('./FFI/Export/ExportRepository'),
    require('./FFI/FFIFactory'),
    require('./FFI/Internals/FunctionInternalsClassFactory'),
    require('./FFI/Internals/Internals'),
    require('./FFI/Call/NativeCaller'),
    require('./FFI/Value/PHPObject'),
    require('./FFI/Value/Proxy/ProxyClassFactory'),
    require('./FFI/Value/Proxy/ProxyClassRepository'),
    require('./FFI/Value/Proxy/ProxyFactory'),
    require('./FFI/Value/Proxy/ProxyMemberFactory'),
    require('./FFI/Result'),
    require('./FFI/Value/ResultValue'),
    require('./FFI/Stack/StackHooker'),
    require('./FFI/Export/UnwrapperRepository'),
    require('./FFI/Call/ValueCaller'),
    require('./FFI/Value/ValueCoercer'),
    require('./FFI/Value/ValueHelper'),
    require('./FFI/Value/ValueStorage'),
    require('./Control/Flow'),
    require('./Function/FunctionContext'),
    require('./FunctionFactory'),
    require('./Function/FunctionSpec'),
    require('./Function/FunctionSpecFactory'),
    require('./Value/Future'),
    require('./Load/Includer'),
    require('./INIState'),
    require('./Load/Loader'),
    require('./Load/LoadScope'),
    require('./Function/MethodContext'),
    require('./MethodSpec'),
    require('./Module'),
    require('./ModuleFactory'),
    require('./Core/Opcode/ModuleScope'),
    require('./Namespace'),
    require('./NamespaceFactory'),
    require('./NamespaceScope'),
    require('./Reference/Null'),
    require('./Reference/ObjectElement'),
    require('./Load/OnceIncluder'),
    require('./Core/Internals/OpcodeInternalsClassFactory'),
    require('./OptionSet'),
    require('./Output/Output'),
    require('./Output/OutputBuffer'),
    require('./Output/OutputFactory'),
    require('./Function/Parameter'),
    require('./Function/ParameterFactory'),
    require('./Function/ParameterListFactory'),
    require('./Function/ParameterTypeFactory'),
    require('./Control/Pause'),
    require('./Control/PauseFactory'),
    require('./Reference/Property'),
    require('./ReferenceFactory'),
    require('./Reference/ReferenceSlot'),
    require('./Scope'),
    require('./ScopeFactory'),
    require('./Service/ServiceInternals'),
    require('./Reference/StaticProperty'),
    require('./Output/StdoutBuffer'),
    require('./SuperGlobalScope'),
    require('./Control/Trace'),
    require('./Error/TraceFormatter'),
    require('./Function/TypedFunction'),
    require('./Reference/UndeclaredStaticProperty'),
    require('./Control/Userland'),
    require('./Class/Definition/UserlandDefinitionBuilder'),
    require('./Value'),
    require('./ValueFactory'),
    require('./Variable'),
    require('./VariableFactory')
], function (
    _,
    builtinTypes,
    phpCommon,
    AccessorReference,
    CallStack,
    ClassAutoloader,
    ClassDefiner,
    ClassFactory,
    ClassPromoter,
    Closure,
    ClosureContext,
    ClosureFactory,
    Container,
    ControlFactory,
    Core,
    CoreBinder,
    CoreFactory,
    ElementProviderFactory,
    ElementReference,
    EngineScope,
    ErrorConfiguration,
    ErrorConverter,
    ErrorPromoter,
    ErrorReporting,
    Evaluator,
    FFIAsyncObjectValue,
    FFICaller,
    FFIClassInternalsClassFactory,
    FFIExportFactory,
    FFIExportRepository,
    FFIFactory,
    FFIFunctionInternalsClassFactory,
    FFIInternals,
    FFINativeCaller,
    FFIPHPObject,
    FFIProxyClassFactory,
    FFIProxyClassRepository,
    FFIProxyFactory,
    FFIProxyMemberFactory,
    FFIResult,
    FFIResultValue,
    FFIStackHooker,
    FFIUnwrapperRepository,
    FFIValueCaller,
    FFIValueCoercer,
    FFIValueHelper,
    FFIValueStorage,
    Flow,
    FunctionContext,
    FunctionFactory,
    FunctionSpec,
    FunctionSpecFactory,
    FutureValue,
    Includer,
    INIState,
    Loader,
    LoadScope,
    MethodContext,
    MethodSpec,
    Module,
    ModuleFactory,
    ModuleScope,
    Namespace,
    NamespaceFactory,
    NamespaceScope,
    NullReference,
    ObjectElement,
    OnceIncluder,
    OpcodeInternalsClassFactory,
    OptionSet,
    Output,
    OutputBuffer,
    OutputFactory,
    Parameter,
    ParameterFactory,
    ParameterListFactory,
    ParameterTypeFactory,
    Pause,
    PauseFactory,
    PropertyReference,
    ReferenceFactory,
    ReferenceSlot,
    Scope,
    ScopeFactory,
    ServiceInternals,
    StaticPropertyReference,
    StdoutBuffer,
    SuperGlobalScope,
    Trace,
    TraceFormatter,
    TypedFunction,
    UndeclaredStaticPropertyReference,
    Userland,
    UserlandDefinitionBuilder,
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
                var groupBindings = groupFactory(state.ffiInternals);

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
                var groupBuiltins = groupFactory(state.ffiInternals),
                    functionAliases = {};

                _.each(groupBuiltins, function (fn, name) {
                    if (typeof fn === 'function') {
                        state.defineNonCoercingFunction(name, fn);
                    } else if (fn instanceof TypedFunction) {
                        // Function was defined with a signature in order to specify parameters.
                        state.defineNonCoercingFunction(name, fn.getFunction(), fn.getSignature());
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
                var groupBuiltins = groupFactory(state.ffiInternals);

                _.each(groupBuiltins, installClass);
            }

            /**
             * Installs a set of related constants into PHP-land
             *
             * @param {Function} groupFactory
             */
            function installConstantGroup(groupFactory) {
                var groupBuiltins = groupFactory(state.ffiInternals);

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
                var groupBuiltins = groupFactory(state.ffiInternals);

                _.each(groupBuiltins, function (value, name) {
                    state.iniState.set(name, value);
                });
            }

            /**
             * Runs the given initialiser group.
             *
             * @param {Function} initialiserGroup
             */
            function runInitialiserGroup(initialiserGroup) {
                initialiserGroup(state.ffiInternals);
            }

            /**
             * Installs a set of opcode handlers
             *
             * @param {Function} groupFactory
             */
            function installOpcodeGroup(groupFactory) {
                state.defineOpcodeGroup(groupFactory);
            }

            /**
             * Installs a set of related runtime options
             *
             * @param {Function} groupFactory
             */
            function installOptionGroup(groupFactory) {
                var groupOptions = groupFactory(state.ffiInternals);

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
            _.each(builtinTypes.opcodeGroups, installOpcodeGroup);
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

            _.each(builtinTypes.initialiserGroups, runInitialiserGroup);

            // Optional installed builtins
            _.each(optionGroups, installOptionGroup);
            state.bindings = {};
            _.each(installedBuiltinTypes.translationCatalogues, installTranslationCatalogues);
            _.each(installedBuiltinTypes.constantGroups, installConstantGroup);
            _.each(installedBuiltinTypes.defaultINIGroups, installDefaultINIOptionGroup);
            _.each(installedBuiltinTypes.bindingGroups, installBindingGroup);
            // TODO: Add "exposures" for addons to expose things to transpiled code
            // TODO: Add "externals" for addons to expose things to external code (eg. engine.getExternal(...))?
            _.each(installedBuiltinTypes.opcodeGroups, installOpcodeGroup);
            _.each(installedBuiltinTypes.functionGroups, installFunctionGroup);
            _.each(installedBuiltinTypes.classGroups, installClassGroup);
            _.forOwn(installedBuiltinTypes.classes, installClass);
            _.each(installedBuiltinTypes.initialiserGroups, runInitialiserGroup);
        },
        Exception = phpCommon.Exception;

    /**
     * Encapsulates an internal PHP state, defining classes, functions, global variables etc.
     *
     * For now this class also serves as the main dependency injection container for all services
     * that relate to a specific internal PHP environment's state.
     *
     * @param {Runtime} runtime
     * @param {GlobalStackHooker} globalStackHooker
     * @param {Object} installedBuiltinTypes
     * @param {Stream} stdin
     * @param {Stream} stdout
     * @param {Stream} stderr
     * @param {string} mode
     * @param {Function[]} optionGroups
     * @param {Object} options
     * @constructor
     */
    function PHPState(
        runtime,
        globalStackHooker,
        installedBuiltinTypes,
        stdin,
        stdout,
        stderr,
        mode,
        optionGroups,
        options
    ) {
        /**
         * Loads the service container, applying overrides from addons if installed.
         *
         * @param {PHPState} state
         * @returns {Container}
         */
        function loadServiceContainer(state) {
            /**
             * Installs a set of service providers.
             *
             * @param {Function} groupFactory
             */
            function installServiceGroup(groupFactory) {
                state.defineServiceGroup(groupFactory);
            }

            var container = new Container({
                'stderr': stderr
            });

            state.container = container;

            // Core services.
            _.each(builtinTypes.serviceGroups, installServiceGroup);

            // Optional installed services.
            _.each(installedBuiltinTypes.serviceGroups, installServiceGroup);

            return container;
        }

        var container = loadServiceContainer(this),
            get = container.getServiceFetcher(),
            /**
             * Sets a service on the container directly. Note that this is only intended to be used
             * transitionally - once all services have been defined using service groups,
             * this should no longer be necessary.
             *
             * @param {string} id
             * @param {Object} service
             * @returns {*}
             */
            set = function (id, service) {
                if (container.hasService(id)) {
                    // The service has been overridden - return the overridden value instead.
                    return container.getService(id);
                }

                container.setService(id, service);

                return service;
            },
            callFactory = get('call_factory'),
            moduleFactory = new ModuleFactory(Module),
            translator = get('translator'),
            iniState = new INIState(),
            getConstant = this.getConstant.bind(this),
            errorConfiguration = new ErrorConfiguration(iniState),
            errorConverter = new ErrorConverter(getConstant),
            traceFormatter = new TraceFormatter(translator),
            errorReporting = set('error_reporting', new ErrorReporting(
                errorConfiguration,
                errorConverter,
                traceFormatter,
                translator,
                stdout,
                stderr
            )),
            errorPromoter = set('error_promoter', new ErrorPromoter(errorReporting)),
            ffiValueStorage = set('ffi_value_storage', new FFIValueStorage()),
            controlBridge = get('control_bridge'),
            controlScope = get('control_scope'),
            opcodePool = get('opcode_pool'),
            controlFactory = new ControlFactory(Trace, opcodePool),
            valueFactory = set('value_factory', new ValueFactory(
                mode,
                translator,
                callFactory,
                errorPromoter,
                ffiValueStorage,
                controlBridge,
                controlScope
            )),
            callStack = get('call_stack'),
            pauseFactory = set('pause_factory', new PauseFactory(Pause, callStack, controlScope, mode)),
            userland = new Userland(callStack, controlFactory, controlBridge, controlScope, valueFactory, opcodePool, mode),
            futureFactory = get('future_factory'),
            flow = set('flow', new Flow(controlFactory, controlBridge, controlScope, futureFactory, mode)),
            referenceFactory = set('reference_factory', new ReferenceFactory(
                AccessorReference,
                ElementReference,
                NullReference,
                ObjectElement,
                PropertyReference,
                ReferenceSlot,
                StaticPropertyReference,
                UndeclaredStaticPropertyReference,
                valueFactory,
                futureFactory,
                callStack
            )),
            elementProviderFactory = new ElementProviderFactory(referenceFactory, futureFactory),
            elementProvider = elementProviderFactory.createProvider(),
            classAutoloader = new ClassAutoloader(valueFactory, flow),

            ffiCaller = new FFICaller(
                callFactory,
                callStack,
                errorPromoter,
                flow,
                mode
            ),
            ffiNativeCaller = new FFINativeCaller(ffiCaller, mode),
            ffiValueCaller = new FFIValueCaller(ffiCaller, mode),
            ffiFactory = set('ffi_factory', new FFIFactory(
                FFIAsyncObjectValue,
                FFIPHPObject,
                FFIResultValue,
                FFIValueCoercer,
                valueFactory,
                referenceFactory,
                futureFactory,
                flow,
                callStack,
                ffiNativeCaller,
                ffiValueCaller
            )),
            ffiProxyMemberFactory = new FFIProxyMemberFactory(
                valueFactory,
                ffiValueStorage,
                ffiNativeCaller,
                controlScope
            ),
            ffiProxyClassFactory = new FFIProxyClassFactory(ffiValueStorage, ffiProxyMemberFactory),
            ffiProxyClassRepository = new FFIProxyClassRepository(ffiProxyClassFactory),
            ffiProxyFactory = new FFIProxyFactory(ffiProxyClassRepository, mode),
            ffiUnwrapperRepository = new FFIUnwrapperRepository(),
            ffiExportFactory = new FFIExportFactory(ffiUnwrapperRepository, ffiProxyFactory),
            ffiExportRepository = new FFIExportRepository(ffiExportFactory, ffiValueStorage),
            ffiValueHelper = new FFIValueHelper(ffiProxyFactory, ffiFactory, ffiValueStorage, mode),

            parameterFactory = new ParameterFactory(Parameter, callStack, translator, futureFactory, flow, userland),
            parameterTypeFactory = new ParameterTypeFactory(get('spec_type_provider')),
            parameterListFactory = new ParameterListFactory(parameterFactory, parameterTypeFactory),
            functionSpecFactory = set('function_spec_factory', new FunctionSpecFactory(
                FunctionSpec,
                FunctionContext,
                MethodContext,
                ClosureContext,
                callStack,
                translator,
                parameterListFactory,
                get('return_type_provider'),
                valueFactory,
                futureFactory,
                flow
            )),
            variableFactory = new VariableFactory(Variable, callStack, valueFactory, referenceFactory, futureFactory),
            superGlobalScope = new SuperGlobalScope(variableFactory),
            scopeFactory = new ScopeFactory(
                ModuleScope,
                EngineScope,
                LoadScope,
                Scope,
                NamespaceScope,
                callStack,
                controlScope,
                translator,
                superGlobalScope,
                functionSpecFactory,
                valueFactory,
                variableFactory,
                referenceFactory
            ),
            functionFactory = set('function_factory', new FunctionFactory(
                MethodSpec,
                scopeFactory,
                callFactory,
                valueFactory,
                callStack,
                flow,
                controlBridge,
                controlScope
            )),
            closureFactory = new ClosureFactory(functionFactory, valueFactory, callStack, Closure),
            userlandDefinitionBuilder = new UserlandDefinitionBuilder(
                callStack,
                valueFactory,
                ffiFactory
            ),
            classFactory = new ClassFactory(
                valueFactory,
                get('value_provider'),
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                ffiExportRepository,
                ffiFactory
            ),
            classPromoter = new ClassPromoter(classFactory, get('method_promoter')),
            classDefiner = new ClassDefiner(
                flow,
                futureFactory,
                get('native_class_definition_builder'),
                userlandDefinitionBuilder,
                classPromoter
            ),
            namespaceFactory = new NamespaceFactory(
                Namespace,
                callStack,
                futureFactory,
                functionFactory,
                functionSpecFactory,
                valueFactory,
                classAutoloader,
                classDefiner
            ),
            globalNamespace = set('global_namespace', namespaceFactory.create()),
            // The global/default module (not eg. the same as the command line module)
            globalModule = moduleFactory.create(null),
            // "Invisible" global namespace scope, not defined by any code
            globalNamespaceScope = new NamespaceScope(
                scopeFactory,
                globalNamespace,
                valueFactory,
                callStack,
                globalModule,
                globalNamespace,
                true
            ),
            globalScope,
            ffiInternals,
            ffiClassInternalsClassFactory,
            ffiFunctionInternalsClassFactory,
            opcodeInternalsClassFactory,
            globalsSuperGlobal = superGlobalScope.defineVariable('GLOBALS'),
            loader = new Loader(valueFactory, mode),
            includer,
            onceIncluder,
            evaluator,
            optionSet,
            output = new Output(new OutputFactory(OutputBuffer), new StdoutBuffer(stdout)),
            state = this,
            hostScheduler = get('host_scheduler'),
            opcodeHandlerFactory = get('opcode_handler_factory'),
            coroutineFactory = get('coroutine_factory'),
            coreBinder = new CoreBinder(),
            coreFactory;

        callFactory.setControlFactory(controlFactory);
        controlScope.setCoroutineFactory(coroutineFactory);
        pauseFactory.setFutureFactory(futureFactory);
        scopeFactory.setClosureFactory(closureFactory);
        globalScope = scopeFactory.create();
        scopeFactory.setGlobalNamespace(globalNamespace);
        scopeFactory.setGlobalScope(globalScope);
        classAutoloader.setGlobalNamespace(globalNamespace);
        valueFactory.setCallStack(callStack);
        valueFactory.setElementProvider(elementProvider);

        valueFactory.setFlow(flow);
        valueFactory.setFutureFactory(futureFactory);
        valueFactory.setGlobalNamespace(globalNamespace);
        valueFactory.setReferenceFactory(referenceFactory);

        // Make a copy of the options object so we don't mutate it
        options = _.extend({}, options || {});

        optionSet = new OptionSet(options);

        includer = new Includer(
            callStack,
            valueFactory,
            scopeFactory,
            loader,
            optionSet,
            flow
        );
        onceIncluder = new OnceIncluder(valueFactory, includer);
        evaluator = new Evaluator(
            scopeFactory,
            translator,
            optionSet,
            callStack,
            loader
        );

        coreFactory = new CoreFactory(
            Core,
            valueFactory,
            coreBinder
        );

        ffiInternals = new FFIInternals(
            mode,
            userland,
            flow,
            controlScope,
            includer,
            onceIncluder,
            evaluator,
            valueFactory,
            get('value_provider'),
            referenceFactory,
            controlFactory,
            pauseFactory,
            futureFactory,
            callFactory,
            callStack,
            ffiValueHelper,
            classAutoloader,
            errorConfiguration,
            errorPromoter,
            errorReporting,
            globalNamespace,
            globalScope,
            iniState,
            optionSet,
            output,
            runtime,
            stdout,
            traceFormatter,
            translator,
            state
        );
        ffiClassInternalsClassFactory = new FFIClassInternalsClassFactory(
            ffiInternals,
            ffiUnwrapperRepository,
            valueFactory,
            globalNamespace,
            globalNamespaceScope
        );
        ffiFunctionInternalsClassFactory = new FFIFunctionInternalsClassFactory(
            ffiInternals,
            valueFactory,
            ffiFactory,
            globalNamespace,
            globalNamespaceScope,
            get('function_signature_parser')
        );
        opcodeInternalsClassFactory = new OpcodeInternalsClassFactory(
            ffiInternals,
            opcodeHandlerFactory
        );

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
                    // Clear these accessors first. Note there should be no need to await
                    // any future here as there should be none returned by default.
                    globalsSuperGlobal.unset();

                    return globalsSuperGlobal.setValue(valueFactory.coerce(newNative));
                }
            )
        );

        this.bindings = null;
        this.callFactory = callFactory;
        this.callStack = callStack;
        this.ClassInternals = ffiClassInternalsClassFactory.create();
        /**
         * @type {Container}
         */
        this.container = container;
        /**
         * @type {ControlBridge}
         */
        this.controlBridge = controlBridge;
        /**
         * @type {ControlFactory}
         */
        this.controlFactory = controlFactory;
        /**
         * @type {ControlScope}
         */
        this.controlScope = controlScope;
        /**
         * @type {CoreBinder}
         */
        this.coreBinder = coreBinder;
        this.coreFactory = coreFactory;
        this.errorReporting = errorReporting;
        /**
         * @type {Flow}
         */
        this.flow = flow;
        this.FunctionInternals = ffiFunctionInternalsClassFactory.create();
        /**
         * @type {FutureFactory}
         */
        this.futureFactory = futureFactory;
        this.globalNamespace = globalNamespace;
        this.globalNamespaceScope = globalNamespaceScope;
        this.globalScope = globalScope;
        /**
         * @type {HostScheduler}
         */
        this.hostScheduler = hostScheduler;
        this.iniState = iniState;
        this.OpcodeInternals = opcodeInternalsClassFactory.create();
        this.options = options;
        this.optionSet = optionSet;
        /**
         * @type {PauseFactory}
         */
        this.pauseFactory = pauseFactory;
        this.ffiInternals = ffiInternals;
        this.ffiStackHooker = new FFIStackHooker(globalStackHooker, this.optionSet);
        this.ffiValueHelper = ffiValueHelper;
        this.output = output;

        this.loader = loader;
        this.mode = mode;
        this.moduleFactory = moduleFactory;
        this.referenceFactory = referenceFactory;
        this.scopeFactory = scopeFactory;
        this.callStack = callStack;
        this.classAutoloader = classAutoloader;
        this.stderr = stderr;
        this.stdin = stdin;
        this.stdout = stdout;
        this.superGlobalScope = superGlobalScope;
        this.throwableInterfaceDefined = false;
        this.translator = translator;
        this.userland = userland;
        this.valueFactory = valueFactory;

        // Load builtins (which involves entering JS-land as far as any Futures are concerned)
        // inside a Coroutine.
        controlScope.enterCoroutine();

        setUpState(this, installedBuiltinTypes, optionGroups || []);

        // Install custom FFI JS engine stack trace handling, if enabled
        this.ffiStackHooker.hook();

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
         * Creates a new FFI Result, to provide the result of a call to a JS function
         *
         * @param {Function} syncCallback
         * @param {Function|null} asyncCallback
         * @returns {FFIResult}
         */
        createFFIResult: function (syncCallback, asyncCallback) {
            var state = this;

            return new FFIResult(syncCallback, asyncCallback, state.valueFactory, state.mode);
        },

        /**
         * Defines a new class (in any namespace)
         *
         * @param {string} fqcn FQCN of the class to define
         * @param {function} definitionFactory Called with `internals` object, returns the class definition
         */
        defineClass: function (fqcn, definitionFactory) {
            var state = this,
                classFuture,
                classInternals = new state.ClassInternals(fqcn);

            if (fqcn === THROWABLE_INTERFACE) {
                if (state.throwableInterfaceDefined) {
                    throw new Error('PHPState.defineClass(...) :: Throwable interface is already defined');
                }

                state.throwableInterfaceDefined = true;
            }

            classFuture = classInternals.defineClass(definitionFactory);

            try {
                // Ensure all built-in classes are installed synchronously (for now).
                classFuture.yieldSync();
            } catch (error) {
                if (state.valueFactory.isValue(error)) {
                    // Don't throw Value objects up the call stack during initialisation,
                    // coerce them to valid native Errors.
                    throw new Exception(
                        'Failed to load builtin class "' + fqcn + '": ' +
                        error.coerceToNativeError()
                    );
                }

                throw error;
            }
        },

        /**
         * Defines a global function from a native JS one. If a fully-qualified name is provided
         * with a namespace prefix, eg. `My\Lib\MyFunc` then it will be defined in the specified namespace
         *
         * @param {string} name
         * @param {Function} fn
         * @param {string=} signature Function signature (parameter and return type definitions)
         */
        defineCoercingFunction: function (name, fn, signature) {
            var state = this;

            state.defineFunction(name, function (internals) {
                if (signature) {
                    internals.defineSignature(signature);
                }

                return fn;
            });
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
         * Defines a global function from a native JS one. If a fully-qualified name is provided
         * with a namespace prefix, eg. `My\Lib\MyFunc` then it will be defined in the specified namespace
         *
         * @param {string} fqfn
         * @param {Function} definitionFactory
         */
        defineFunction: function (fqfn, definitionFactory) {
            var state = this,
                functionInternals = new state.FunctionInternals(fqfn);

            functionInternals.defineFunction(definitionFactory);
        },

        /**
         * Defines a global variable and gives it the provided value,
         * if not already defined. If the variable is already defined
         * in this scope then an error will be thrown.
         *
         * @param {string} name
         * @param {Value|*} value Value object or native value to be coerced
         * @returns {Value} Returns the value assigned, which may have been a FutureValue, settled synchronously
         * @throws {Error} Throws when the global scope already defines the specified variable
         */
        defineGlobal: function (name, value) {
            var state = this;

            if (state.globalScope.hasVariable(name)) {
                throw new Error(
                    'PHPState.defineGlobal() :: Variable "' + name + '" is already defined in the global scope'
                );
            }

            return state.globalScope.defineVariable(name).setValue(state.valueFactory.coerce(value)).yieldSync();
        },

        /**
         * Defines a global variable using a getter/setter pair
         *
         * @param {string} name
         * @param {Function} valueGetter
         * @param {Function=} valueSetter
         * @param {Function=} referenceSetter
         */
        defineGlobalAccessor: function (name, valueGetter, valueSetter, referenceSetter) {
            var state = this,
                accessorReference = state.referenceFactory.createAccessor(
                    valueGetter.bind(state.ffiInternals),
                    valueSetter ? valueSetter.bind(state.ffiInternals) : null,
                    referenceSetter ? referenceSetter.bind(state.ffiInternals) : null
                );

            state.globalScope.defineVariable(name).setReference(accessorReference);
        },

        /**
         * Defines a global function from a native JS one. If a fully-qualified name is provided
         * with a namespace prefix, eg. `My\Lib\MyFunc` then it will be defined in the specified namespace
         *
         * @param {string} name
         * @param {Function} fn
         * @param {string=} signature Function signature (parameter and return type definitions)
         */
        defineNonCoercingFunction: function (name, fn, signature) {
            var state = this;

            state.defineFunction(name, function (internals) {
                if (signature) {
                    internals.defineSignature(signature);
                }

                internals.disableAutoCoercion();

                return fn;
            });
        },

        /**
         * Installs a set of opcode handlers
         *
         * @param {Function} groupFactory
         */
        defineOpcodeGroup: function (groupFactory) {
            var state = this,
                internals = new state.OpcodeInternals(),
                groupBuiltins = groupFactory(internals),
                isOverrideAllowed = internals.isOpcodeOverrideAllowed();

            if (isOverrideAllowed) {
                // Opcode overriding is allowed, so provide the opcode group with the previous handlers
                // for all of the opcode handlers they define, so that the previous versions may be called
                internals.setPreviousOpcodes(state.coreBinder.getOpcodeHandlers(Object.keys(groupBuiltins)));
            }

            _.forOwn(groupBuiltins, function (handler, name) {
                state.coreBinder.defineOpcode(name, internals.createTracedHandler(handler), isOverrideAllowed);
            });
        },

        /**
         * Installs a set of service providers
         *
         * @param {Function} groupFactory
         */
        defineServiceGroup: function (groupFactory) {
            var state = this,
                internals = new ServiceInternals(state.container),
                groupBuiltins = groupFactory(internals),
                isOverrideAllowed = internals.isServiceOverrideAllowed();

            if (isOverrideAllowed) {
                // Service overriding is allowed, so provide the service group with the previous providers
                // for all of the service providers they define, so that the previous versions may be called.
                internals.setPreviousServiceProviders(state.container.getServiceProviders(Object.keys(groupBuiltins)));
            }

            _.forOwn(groupBuiltins, function (provider, id) {
                state.container.defineService(id, provider, isOverrideAllowed);
            });
        },

        /**
         * Defines a super global variable (available in all scopes implicitly,
         * unlike a normal global which is not available unless imported with a `global` statement)
         * and gives it the provided value. If a native value is given then it will be coerced to a PHP one.
         *
         * @param {string} name
         * @param {Value|*} value
         * @returns {Value} Returns the value assigned, which may be a FutureValue
         */
        defineSuperGlobal: function (name, value) {
            var state = this;

            return state.superGlobalScope
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
                accessorReference = state.referenceFactory.createAccessor(
                    valueGetter.bind(state.ffiInternals),
                    valueSetter ? valueSetter.bind(state.ffiInternals) : null
                );

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

            if (state.bindings === null) {
                // Option groups are loaded before bindings, so if any of them attempt to access a binding
                // too early then throw a meaningful error message
                throw new Exception('Option groups cannot access bindings too early');
            }

            if (!hasOwn.call(state.bindings, bindingName)) {
                throw new Exception('No binding is defined with name "' + bindingName + '"');
            }

            return state.bindings[bindingName];
        },

        getCallFactory: function () {
            return this.callFactory;
        },

        /**
         * Fetches the CallStack service
         *
         * @returns {CallStack}
         */
        getCallStack: function () {
            return this.callStack;
        },

        /**
         * Fetches the native value of the given PHP constant, or null if it does not exist
         *
         * @param {string} name
         * @returns {*|null}
         */
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
         * Fetches the ControlBridge service
         *
         * @returns {ControlBridge}
         */
        getControlBridge: function () {
            return this.controlBridge;
        },

        /**
         * Fetches the ControlFactory service
         *
         * @returns {ControlFactory}
         */
        getControlFactory: function () {
            return this.controlFactory;
        },

        /**
         * Fetches the ControlScope service
         *
         * @returns {ControlScope}
         */
        getControlScope: function () {
            return this.controlScope;
        },

        /**
         * Fetches the CoreBinder service
         *
         * @returns {CoreBinder}
         */
        getCoreBinder: function () {
            return this.coreBinder;
        },

        /**
         * Fetches the CoreFactory service
         *
         * @returns {CoreFactory}
         */
        getCoreFactory: function () {
            return this.coreFactory;
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
         * Fetches the FFI Internals service.
         *
         * @returns {FFIInternals}
         */
        getFFIInternals: function () {
            return this.ffiInternals;
        },

        /**
         * Fetches the FFI value helper service
         *
         * @returns {ValueHelper}
         */
        getFFIValueHelper: function () {
            return this.ffiValueHelper;
        },

        /**
         * Fetches the control Flow helper service
         *
         * @returns {Flow}
         */
        getFlow: function () {
            return this.flow;
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
         * Fetches the FutureFactory service
         *
         * @returns {FutureFactory}
         */
        getFutureFactory: function () {
            return this.futureFactory;
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
         * Fetches the HostScheduler service.
         *
         * @returns {HostScheduler}
         */
        getHostScheduler: function () {
            return this.hostScheduler;
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
         * Fetches the PauseFactory service.
         *
         * @returns {PauseFactory}
         */
        getPauseFactory: function () {
            return this.pauseFactory;
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

        /**
         * Fetches a defined service by its ID.
         *
         * @param {string} id
         * @returns {*}
         */
        getService: function (id) {
            return this.container.getService(id);
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

        /**
         * Fetches the Userland service
         *
         * @returns {Userland}
         */
        getUserland: function () {
            return this.userland;
        },

        /**
         * Fetches the ValueFactory service
         *
         * @returns {ValueFactory}
         */
        getValueFactory: function () {
            return this.valueFactory;
        },

        /**
         * Fetches the ValueProvider service.
         *
         * @returns {ValueProvider}
         */
        getValueProvider: function () {
            return this.container.getService('value_provider');
        },

        /**
         * Schedules a callback to run asynchronously in a macrotask
         * (macrotasks wait for the _next_ event loop tick, allowing DOM events to fire etc.).
         *
         * @param {Function} callback
         */
        queueMacrotask: function (callback) {
            return this.hostScheduler.queueMacrotask(callback);
        },

        /**
         * Schedules a callback to run asynchronously in a microtask
         * (microtasks are called at the end of the _current_ event loop tick, so any DOM events etc.
         * will not be fired in between).
         *
         * @param {Function} callback
         */
        queueMicrotask: function (callback) {
            return this.hostScheduler.queueMicrotask(callback);
        },

        /**
         * Sets the value of an existing PHP global. If a native value is given
         * then it will be coerced to a PHP one.
         * If the global is not defined than an error will be thrown -
         * use .defineGlobal(...) when defining a new variable
         *
         * @param {string} name
         * @param {Value|*} value Value object or native value to be coerced
         * @returns {Value} Returns the value assigned, which may be a FutureValue
         * @throws {Error} Throws if the variable is not defined in the global scope
         */
        setGlobal: function (name, value) {
            var state = this;

            if (!state.globalScope.hasVariable(name)) {
                throw new Error(
                    'PHPState.setGlobal() :: Variable "' + name + '" is not defined in the global scope'
                );
            }

            return state.globalScope.getVariable(name).setValue(state.valueFactory.coerce(value));
        }
    });

    return PHPState;
}, {strict: true});
