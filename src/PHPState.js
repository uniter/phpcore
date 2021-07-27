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
    require('./Core/Opcode/OpcodeHandlerFactory'),
    require('./Core/Opcode/Opcode/CalculationOpcode'),
    require('./Core/Opcode/Fetcher/CalculationOpcodeFetcher'),
    require('./Call'),
    require('./CallFactory'),
    require('./CallStack'),
    require('./ClassAutoloader'),
    require('./Closure'),
    require('./Function/ClosureContext'),
    require('./ClosureFactory'),
    require('./Control/ControlBridge'),
    require('./Core/Opcode/Opcode/ControlExpressionOpcode'),
    require('./Core/Opcode/Fetcher/ControlExpressionOpcodeFetcher'),
    require('./Control/ControlFactory'),
    require('./Control/ControlScope'),
    require('./Core/Opcode/Opcode/ControlStructureOpcode'),
    require('./Core/Opcode/Fetcher/ControlStructureOpcodeFetcher'),
    require('./Core/Core'),
    require('./Core/CoreBinder'),
    require('./Core/CoreFactory'),
    require('./Reference/Element/ElementProviderFactory'),
    require('./Reference/Element'),
    require('./Error/ErrorConfiguration'),
    require('./Error/ErrorConverter'),
    require('./Error/ErrorPromoter'),
    require('./Error/ErrorReporting'),
    require('./Load/Evaluator'),
    require('./FFI/Value/AsyncObjectValue'),
    require('./FFI/Call'),
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
    require('./Control/Future'),
    require('./Control/FutureFactory'),
    require('./Value/Future'),
    require('./Load/Includer'),
    require('./INIState'),
    require('./Load/Loader'),
    require('./Load/LoadScope'),
    require('./Core/Opcode/Opcode/LoopStructureOpcode'),
    require('./Core/Opcode/Fetcher/LoopStructureOpcodeFetcher'),
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
    require('./Core/Opcode/Opcode/OpcodeFactory'),
    require('./Core/Opcode/Fetcher/OpcodeFetcherRepository'),
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
    require('./Control/Sequence'),
    require('./Reference/StaticProperty'),
    require('./Output/StdoutBuffer'),
    require('./SuperGlobalScope'),
    require('./Tools'),
    require('./ToolsFactory'),
    require('./Control/Trace'),
    require('./Error/TraceFormatter'),
    require('./Type/TypeFactory'),
    require('./Reference/UndeclaredStaticProperty'),
    require('./Core/Opcode/Opcode/UntracedOpcode'),
    require('./Control/Userland'),
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
    OpcodeHandlerFactory,
    CalculationOpcode,
    CalculationOpcodeFetcher,
    Call,
    CallFactory,
    CallStack,
    ClassAutoloader,
    Closure,
    ClosureContext,
    ClosureFactory,
    ControlBridge,
    ControlExpressionOpcode,
    ControlExpressionOpcodeFetcher,
    ControlFactory,
    ControlScope,
    ControlStructureOpcode,
    ControlStructureOpcodeFetcher,
    Core,
    CoreBinder,
    CoreFactory,
    ElementProviderFactory,
    ElementReference,
    ErrorConfiguration,
    ErrorConverter,
    ErrorPromoter,
    ErrorReporting,
    Evaluator,
    FFIAsyncObjectValue,
    FFICall,
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
    Future,
    FutureFactory,
    FutureValue,
    Includer,
    INIState,
    Loader,
    LoadScope,
    LoopStructureOpcode,
    LoopStructureOpcodeFetcher,
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
    OpcodeFactory,
    OpcodeFetcherRepository,
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
    Sequence,
    StaticPropertyReference,
    StdoutBuffer,
    SuperGlobalScope,
    Tools,
    ToolsFactory,
    Trace,
    TraceFormatter,
    TypeFactory,
    UndeclaredStaticPropertyReference,
    UntracedOpcode,
    Userland,
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
        },
        Exception = phpCommon.Exception,
        Translator = phpCommon.Translator;

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
     * @param {Resumable|null} pausable
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
        pausable,
        mode,
        optionGroups,
        options
    ) {
        var callFactory = new CallFactory(Call, FFICall),
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
            ffiValueStorage = new FFIValueStorage(),
            controlBridge = new ControlBridge(Future, FutureValue),
            controlScope = new ControlScope(),
            opcodeFactory = new OpcodeFactory(
                CalculationOpcode,
                ControlExpressionOpcode,
                ControlStructureOpcode,
                LoopStructureOpcode,
                UntracedOpcode
            ),
            controlFactory = new ControlFactory(Sequence, Trace, controlBridge, controlScope, opcodeFactory),
            flow = new Flow(controlFactory, controlBridge, controlScope, mode),
            elementProviderFactory = new ElementProviderFactory(flow),
            elementProvider = elementProviderFactory.createProvider(),
            valueFactory = new ValueFactory(
                pausable,
                mode,
                elementProvider,
                translator,
                callFactory,
                errorPromoter,
                ffiValueStorage,
                flow,
                controlBridge,
                controlScope
            ),
            callStack = new CallStack(valueFactory, translator, errorReporting, stderr),
            pauseFactory = new PauseFactory(Pause, callStack, controlFactory, controlScope, mode),
            userland = new Userland(callStack, controlScope, mode),
            referenceFactory = new ReferenceFactory(
                AccessorReference,
                ElementReference,
                NullReference,
                ObjectElement,
                PropertyReference,
                ReferenceSlot,
                StaticPropertyReference,
                UndeclaredStaticPropertyReference,
                valueFactory,
                callStack,
                flow
            ),
            futureFactory = new FutureFactory(
                controlFactory,
                pauseFactory,
                controlBridge,
                Future
            ),
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
            ffiFactory = new FFIFactory(
                FFIAsyncObjectValue,
                FFIPHPObject,
                FFIValueCoercer,
                valueFactory,
                referenceFactory,
                futureFactory,
                callStack,
                ffiNativeCaller,
                ffiValueCaller
            ),
            ffiProxyMemberFactory = new FFIProxyMemberFactory(
                valueFactory,
                ffiValueStorage,
                ffiNativeCaller
            ),
            ffiProxyClassFactory = new FFIProxyClassFactory(ffiValueStorage, ffiProxyMemberFactory),
            ffiProxyClassRepository = new FFIProxyClassRepository(ffiProxyClassFactory),
            ffiProxyFactory = new FFIProxyFactory(ffiProxyClassRepository, mode),
            ffiUnwrapperRepository = new FFIUnwrapperRepository(),
            ffiExportFactory = new FFIExportFactory(ffiUnwrapperRepository, ffiProxyFactory),
            ffiExportRepository = new FFIExportRepository(ffiExportFactory, ffiValueStorage),
            ffiValueHelper = new FFIValueHelper(ffiProxyFactory, ffiFactory, ffiValueStorage, mode),

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
            variableFactory = new VariableFactory(Variable, callStack, valueFactory, referenceFactory, flow),
            superGlobalScope = new SuperGlobalScope(variableFactory),
            scopeFactory = new ScopeFactory(
                ModuleScope,
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
            functionFactory = new FunctionFactory(
                MethodSpec,
                scopeFactory,
                callFactory,
                valueFactory,
                callStack,
                flow,
                controlBridge,
                controlScope
            ),
            closureFactory = new ClosureFactory(functionFactory, valueFactory, callStack, Closure),
            namespaceFactory = new NamespaceFactory(
                Namespace,
                callStack,
                flow,
                functionFactory,
                functionSpecFactory,
                valueFactory,
                referenceFactory,
                classAutoloader,
                ffiExportRepository,
                ffiFactory
            ),
            globalNamespace = namespaceFactory.create(),
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
            opcodeFetcherRepository = new OpcodeFetcherRepository({
                'calculation': new CalculationOpcodeFetcher(opcodeFactory),
                'controlExpression': new ControlExpressionOpcodeFetcher(opcodeFactory),
                'controlStructure': new ControlStructureOpcodeFetcher(opcodeFactory),
                'loopStructure': new LoopStructureOpcodeFetcher(opcodeFactory)
            }),
            opcodeHandlerFactory = new OpcodeHandlerFactory(controlBridge, callStack, opcodeFetcherRepository),
            coreBinder = new CoreBinder(),
            coreFactory,
            toolsFactory;

        callFactory.setControlFactory(controlFactory);
        controlFactory.setFlow(flow);
        elementProvider.setReferenceFactory(referenceFactory);
        elementProviderFactory.setReferenceFactory(referenceFactory);
        flow.setFutureFactory(futureFactory);
        scopeFactory.setClosureFactory(closureFactory);
        globalScope = scopeFactory.create();
        scopeFactory.setGlobalNamespace(globalNamespace);
        scopeFactory.setGlobalScope(globalScope);
        classAutoloader.setGlobalNamespace(globalNamespace);
        valueFactory.setCallStack(callStack);
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

        // FIXME: Deprecated: replaced by CoreFactory
        toolsFactory = new ToolsFactory(
            Tools,
            callStack,
            translator,
            globalNamespace,
            loader,
            includer,
            onceIncluder,
            referenceFactory,
            scopeFactory,
            valueFactory
        );

        coreFactory = new CoreFactory(
            Core,
            valueFactory,
            coreBinder
        );

        ffiInternals = new FFIInternals(
            mode,
            pausable,
            userland,
            flow,
            controlScope,
            includer,
            onceIncluder,
            evaluator,
            valueFactory,
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
            globalNamespaceScope
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
                    // Clear these accessors first
                    globalsSuperGlobal.unset();

                    globalsSuperGlobal.setValue(valueFactory.coerce(newNative));
                }
            )
        );

        this.bindings = null;
        this.callFactory = callFactory;
        this.callStack = callStack;
        this.ClassInternals = ffiClassInternalsClassFactory.create();
        /**
         * @type {ControlFactory}
         */
        this.controlFactory = controlFactory;
        this.coreBinder = coreBinder;
        this.coreFactory = coreFactory;
        this.errorReporting = errorReporting;
        this.flow = flow;
        this.FunctionInternals = ffiFunctionInternalsClassFactory.create();
        /**
         * @type {FutureFactory}
         */
        this.futureFactory = futureFactory;
        this.globalNamespace = globalNamespace;
        this.globalNamespaceScope = globalNamespaceScope;
        this.globalScope = globalScope;
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
        this.pausable = pausable;
        this.stderr = stderr;
        this.stdin = stdin;
        this.stdout = stdout;
        this.superGlobalScope = superGlobalScope;
        this.throwableClassObject = null;
        this.toolsFactory = toolsFactory;
        this.translator = translator;
        this.userland = userland;
        this.valueFactory = valueFactory;

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
         * @returns {Class} Returns the instance of Class that represents a PHP class
         */
        defineClass: function (fqcn, definitionFactory) {
            var state = this,
                classInternals = new state.ClassInternals(fqcn),
                classObject = classInternals.defineClass(definitionFactory);

            if (fqcn === THROWABLE_INTERFACE) {
                if (state.throwableClassObject) {
                    throw new Error('PHPState.defineClass(...) :: Throwable interface is already defined');
                }

                state.throwableClassObject = classObject;
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

            state.defineFunction(name, function () {
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
         * @param {Function=} valueSetter
         */
        defineGlobalAccessor: function (name, valueGetter, valueSetter) {
            var state = this,
                accessorReference = state.referenceFactory.createAccessor(
                    valueGetter.bind(state.ffiInternals),
                    valueSetter ? valueSetter.bind(state.ffiInternals) : null
                );

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
            var state = this;

            state.defineFunction(name, function (internals) {
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
         * Fetches the ControlFactory service
         *
         * @returns {ControlFactory}
         */
        getControlFactory: function () {
            return this.controlFactory;
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
         * Fetches the FFI value helper service
         *
         * @returns {ValueHelper}
         */
        getFFIValueHelper: function () {
            return this.ffiValueHelper;
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
         * Fetches the ToolsFactory service
         *
         * @returns {ToolsFactory}
         */
        getToolsFactory: function () {
            return this.toolsFactory;
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
