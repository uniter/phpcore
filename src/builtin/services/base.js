/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var phpCommon = require('phpcommon'),
    ArrayChainifier = require('../../Control/Chain/ArrayChainifier'),
    ArrayTypeProvider = require('../../Type/Provider/Spec/ArrayTypeProvider'),
    CalculationOpcode = require('../../Core/Opcode/Opcode/CalculationOpcode'),
    CalculationOpcodeFetcher = require('../../Core/Opcode/Fetcher/CalculationOpcodeFetcher'),
    Call = require('../../Call'),
    CallableTypeProvider = require('../../Type/Provider/Spec/CallableTypeProvider'),
    CallFactory = require('../../CallFactory'),
    CallInstrumentation = require('../../Instrumentation/CallInstrumentation'),
    CallStack = require('../../CallStack'),
    Chainifier = require('../../Control/Chain/Chainifier'),
    ClassAutoloader = require('../../ClassAutoloader').sync(),
    ClassDefiner = require('../../Class/ClassDefiner'),
    ClassFactory = require('../../Class/ClassFactory'),
    ClassPromoter = require('../../Class/ClassPromoter'),
    ClassTypeProvider = require('../../Type/Provider/Spec/ClassTypeProvider'),
    Closure = require('../../Closure').sync(),
    ClosureFactory = require('../../ClosureFactory').sync(),
    ControlBridge = require('../../Control/ControlBridge'),
    ControlExpressionOpcode = require('../../Core/Opcode/Opcode/ControlExpressionOpcode'),
    ControlExpressionOpcodeFetcher = require('../../Core/Opcode/Fetcher/ControlExpressionOpcodeFetcher'),
    ControlFactory = require('../../Control/ControlFactory'),
    ControlScope = require('../../Control/ControlScope'),
    ControlStructureOpcode = require('../../Core/Opcode/Opcode/ControlStructureOpcode'),
    ControlStructureOpcodeFetcher = require('../../Core/Opcode/Fetcher/ControlStructureOpcodeFetcher'),
    Coroutine = require('../../Control/Coroutine'),
    CoroutineFactory = require('../../Control/CoroutineFactory'),
    ElementProviderFactory = require('../../Reference/Element/ElementProviderFactory'),
    FFICall = require('../../FFI/Call'),
    FFIExportFactory = require('../../FFI/Export/ExportFactory'),
    FFIExportRepository = require('../../FFI/Export/ExportRepository'),
    FunctionFactory = require('../../FunctionFactory').sync(),
    Future = require('../../Control/Future'),
    FutureFactory = require('../../Control/FutureFactory'),
    HostScheduler = require('../../Control/HostScheduler'),
    InstrumentationFactory = require('../../Instrumentation/InstrumentationFactory'),
    IterableTypeProvider = require('../../Type/Provider/Spec/IterableTypeProvider'),
    LoopStructureOpcode = require('../../Core/Opcode/Opcode/LoopStructureOpcode'),
    LoopStructureOpcodeFetcher = require('../../Core/Opcode/Fetcher/LoopStructureOpcodeFetcher'),
    MethodPromoter = require('../../Class/MethodPromoter'),
    MethodSpec = require('../../MethodSpec'),
    MixedTypeProvider = require('../../Type/Provider/Spec/MixedTypeProvider'),
    Namespace = require('../../Namespace').sync(),
    NamespaceFactory = require('../../NamespaceFactory'),
    NativeDefinitionBuilder = require('../../Class/Definition/NativeDefinitionBuilder'),
    NativeMethodDefinitionBuilder = require('../../Class/Definition/NativeMethodDefinitionBuilder'),
    NullTypeProvider = require('../../Type/Provider/Spec/NullTypeProvider'),
    ObjectTypeProvider = require('../../Type/Provider/Spec/ObjectTypeProvider'),
    OpcodeExecutor = require('../../Core/Opcode/Handler/OpcodeExecutor'),
    OpcodeFactory = require('../../Core/Opcode/Opcode/OpcodeFactory'),
    OpcodeFetcherRepository = require('../../Core/Opcode/Fetcher/OpcodeFetcherRepository'),
    OpcodeHandlerFactory = require('../../Core/Opcode/Handler/OpcodeHandlerFactory'),
    OpcodeHandlerTyper = require('../../Core/Internals/OpcodeHandlerTyper'),
    OpcodeParameter = require('../../Core/Opcode/Parameter/Parameter'),
    OpcodeParameterFactory = require('../../Core/Opcode/Parameter/ParameterFactory'),
    OpcodePool = require('../../Core/Opcode/Opcode/OpcodePool'),
    OpcodeRescuer = require('../../Core/Opcode/Handler/OpcodeRescuer'),
    OpcodeSignatureParser = require('../../Core/Opcode/Signature/SignatureParser'),
    OpcodeTypeFactory = require('../../Core/Opcode/Type/TypeFactory'),
    OpcodeTypeProvider = require('../../Core/Opcode/Type/TypeProvider'),
    Output = require('../../Output/Output'),
    OutputBuffer = require('../../Output/OutputBuffer'),
    OutputFactory = require('../../Output/OutputFactory'),
    Present = require('../../Control/Present'),
    Reference = require('../../Reference/Reference'),
    ReturnTypeProvider = require('../../Function/ReturnTypeProvider'),
    ScalarTypeProvider = require('../../Type/Provider/Spec/ScalarTypeProvider'),
    SignatureParser = require('../../Function/Signature/SignatureParser'),
    SpecTypeProvider = require('../../Type/Provider/Spec/SpecTypeProvider'),
    StdoutBuffer = require('../../Output/StdoutBuffer'),
    Trace = require('../../Control/Trace'),
    Translator = phpCommon.Translator,
    TypeFactory = require('../../Type/TypeFactory'),
    TypedOpcodeHandlerFactory = require('../../Core/Opcode/Handler/TypedOpcodeHandlerFactory'),
    UnionTypeProvider = require('../../Type/Provider/Spec/UnionTypeProvider'),
    UnpausedSentinel = require('../../Core/Opcode/Handler/UnpausedSentinel'),
    UntracedOpcode = require('../../Core/Opcode/Opcode/UntracedOpcode'),
    UserlandDefinitionBuilder = require('../../Class/Definition/UserlandDefinitionBuilder'),
    Value = require('../../Value').sync(),
    ValueProvider = require('../../Value/ValueProvider'),
    Variable = require('../../Variable').sync(),
    VariableFactory = require('../../VariableFactory').sync(),
    VoidTypeProvider = require('../../Type/Provider/Spec/VoidTypeProvider'),

    ARRAY_CHAINIFIER = 'array_chainifier',
    CALL_FACTORY = 'call_factory',
    CALL_STACK = 'call_stack',
    CHAINIFIER = 'chainifier',
    CLASS_AUTOLOADER = 'class_autoloader',
    CLASS_DEFINER = 'class_definer',
    CLASS_FACTORY = 'class_factory',
    CLASS_PROMOTER = 'class_promoter',
    CLOSURE_FACTORY = 'closure_factory',
    CONTROL_BRIDGE = 'control_bridge',
    CONTROL_SCOPE = 'control_scope',
    DESTRUCTIBLE_OBJECT_REPOSITORY = 'garbage.destructible_object_repository',
    ELEMENT_PROVIDER_FACTORY = 'element_provider_factory',
    ERROR_REPORTING = 'error_reporting',
    FFI_EXPORT_FACTORY = 'ffi_export_factory',
    FFI_EXPORT_REPOSITORY = 'ffi_export_repository',
    FFI_FACTORY = 'ffi_factory',
    FFI_PROXY_FACTORY = 'ffi_proxy_factory',
    FFI_UNWRAPPER_REPOSITORY = 'ffi_unwrapper_repository',
    FFI_VALUE_STORAGE = 'ffi_value_storage',
    FLOW = 'flow',
    FUNCTION_FACTORY = 'function_factory',
    FUNCTION_SIGNATURE_PARSER = 'function_signature_parser',
    FUNCTION_SPEC_FACTORY = 'function_spec_factory',
    FUTURE_FACTORY = 'future_factory',
    GARBAGE_CACHE_INVALIDATOR = 'garbage.cache_invalidator',
    GLOBAL_SCOPE = 'global_scope',
    INSTRUMENTATION_FACTORY = 'instrumentation_factory',
    METHOD_PROMOTER = 'method_promoter',
    NAMESPACE_FACTORY = 'namespace_factory',
    NATIVE_CLASS_DEFINITION_BUILDER = 'native_class_definition_builder',
    NATIVE_METHOD_DEFINITION_BUILDER = 'native_method_definition_builder',
    OPCODE_EXECUTOR = 'opcode_executor',
    OPCODE_FACTORY = 'opcode_factory',
    OPCODE_FETCHER_REPOSITORY = 'opcode_fetcher_repository',
    OPCODE_PARAMETER_FACTORY = 'opcode_parameter_factory',
    OPCODE_POOL = 'opcode_pool',
    OPCODE_RESCUER = 'opcode_rescuer',
    OPCODE_SIGNATURE_PARSER = 'opcode_signature_parser',
    OPCODE_TYPE_FACTORY = 'opcode_type_factory',
    OPCODE_TYPE_PROVIDER = 'opcode_type_provider',
    OUTPUT_FACTORY = 'output_factory',
    PAUSE_FACTORY = 'pause_factory',
    REFERENCE_FACTORY = 'reference_factory',
    SCOPE_FACTORY = 'scope_factory',
    SPEC_TYPE_PROVIDER = 'spec_type_provider',
    STDERR = 'stderr',
    STDOUT = 'stdout',
    STDOUT_BUFFER = 'stdout_buffer',
    TRANSLATOR = 'translator',
    TYPE_FACTORY = 'type_factory',
    TYPED_OPCODE_HANDLER_FACTORY = 'typed_opcode_handler_factory',
    UNPAUSED_SENTINEL = 'unpaused_sentinel',
    USERLAND = 'userland',
    USERLAND_CLASS_DEFINITION_BUILDER = 'userland_class_definition_builder',
    VALUE_FACTORY = 'value_factory',
    VALUE_PROVIDER = 'value_provider';

/**
 * Provides the base set of services for the PHP runtime.
 *
 * TODO: Move all remaining services from PHPState to providers here.
 *
 * @param {ServiceInternals} internals
 */
module.exports = function (internals) {
    var get = internals.getServiceFetcher();

    return {
        'array_chainifier': function () {
            return new ArrayChainifier(get(VALUE_FACTORY), get(FUTURE_FACTORY), get(CHAINIFIER));
        },

        'call_factory': function () {
            return new CallFactory(Call, FFICall, get(INSTRUMENTATION_FACTORY));
        },

        'call_stack': function () {
            return new CallStack(
                get(VALUE_FACTORY),
                get(TRANSLATOR),
                get(ERROR_REPORTING),
                get(STDERR)
            );
        },

        'chainifier': function (set) {
            var chainifier = set(new Chainifier(get(FUTURE_FACTORY), get(CONTROL_BRIDGE)));

            chainifier.setArrayChainifier(get(ARRAY_CHAINIFIER));
        },

        'class_autoloader': function () {
            return new ClassAutoloader(get(VALUE_FACTORY), get(FLOW));
        },

        'class_definer': function () {
            return new ClassDefiner(
                get(FLOW),
                get(FUTURE_FACTORY),
                get(NATIVE_CLASS_DEFINITION_BUILDER),
                get(USERLAND_CLASS_DEFINITION_BUILDER),
                get(CLASS_PROMOTER)
            );
        },

        'class_factory': function () {
            return new ClassFactory(
                get(VALUE_FACTORY),
                get(VALUE_PROVIDER),
                get(REFERENCE_FACTORY),
                get(FUNCTION_FACTORY),
                get(CALL_STACK),
                get(FLOW),
                get(FUTURE_FACTORY),
                get(USERLAND),
                get(FFI_EXPORT_REPOSITORY),
                get(FFI_FACTORY),
                get(DESTRUCTIBLE_OBJECT_REPOSITORY)
            );
        },

        'class_promoter': function () {
            return new ClassPromoter(
                get(CLASS_FACTORY),
                get(METHOD_PROMOTER),
                get(INSTRUMENTATION_FACTORY)
            );
        },

        'closure_factory': function () {
            return new ClosureFactory(
                get(FUNCTION_FACTORY),
                get(VALUE_FACTORY),
                get(CALL_STACK),
                Closure
            );
        },

        'control_bridge': function () {
            return new ControlBridge(Future, Present, Reference, Value, Variable);
        },

        'control_factory': function () {
            return new ControlFactory(Trace, get(OPCODE_POOL), get(UNPAUSED_SENTINEL));
        },

        'control_scope': function () {
            return new ControlScope();
        },

        'coroutine_factory': function () {
            return new CoroutineFactory(Coroutine, get(CALL_STACK));
        },

        'element_provider': function () {
            return get(ELEMENT_PROVIDER_FACTORY).createProvider();
        },

        'element_provider_factory': function () {
            return new ElementProviderFactory(
                get(REFERENCE_FACTORY),
                get(FUTURE_FACTORY),
                get(FLOW)
            );
        },

        'ffi_export_factory': function () {
            return new FFIExportFactory(get(FFI_UNWRAPPER_REPOSITORY), get(FFI_PROXY_FACTORY));
        },

        'ffi_export_repository': function () {
            return new FFIExportRepository(get(FFI_EXPORT_FACTORY), get(FFI_VALUE_STORAGE));
        },

        'function_factory': function () {
            return new FunctionFactory(
                MethodSpec,
                get(SCOPE_FACTORY),
                get(CALL_FACTORY),
                get(VALUE_FACTORY),
                get(CALL_STACK),
                get(FLOW),
                get(CONTROL_BRIDGE),
                get(CONTROL_SCOPE)
            );
        },

        'function_signature_parser': function () {
            return new SignatureParser(get(VALUE_FACTORY));
        },

        'future_factory': function (set) {
            var futureFactory = set(new FutureFactory(
                get(PAUSE_FACTORY),
                get(VALUE_FACTORY),
                get(CONTROL_BRIDGE),
                get(CONTROL_SCOPE),
                Future,
                Present
            ));

            futureFactory.setChainifier(get(CHAINIFIER));
        },

        'global_namespace': function (set) {
            var closureFactory = get(CLOSURE_FACTORY),
                namespaceFactory = get(NAMESPACE_FACTORY),
                scopeFactory = get(SCOPE_FACTORY),
                globalNamespace = set(namespaceFactory.create());

            scopeFactory.setClosureFactory(closureFactory);
            scopeFactory.setGlobalNamespace(globalNamespace);
            scopeFactory.setGlobalScope(get(GLOBAL_SCOPE));
        },

        'global_scope': function () {
            var scopeFactory = get(SCOPE_FACTORY);

            return scopeFactory.create();
        },

        'host_scheduler': function () {
            return new HostScheduler();
        },

        'instrumentation_factory': function () {
            return new InstrumentationFactory(CallInstrumentation);
        },

        'method_promoter': function () {
            return new MethodPromoter(get(CALL_STACK), get(FUNCTION_FACTORY), get(FUNCTION_SPEC_FACTORY));
        },

        'namespace_factory': function () {
            return new NamespaceFactory(
                Namespace,
                get(CALL_STACK),
                get(FLOW),
                get(FUNCTION_FACTORY),
                get(FUNCTION_SPEC_FACTORY),
                get(VALUE_FACTORY),
                get(CLASS_AUTOLOADER),
                get(CLASS_DEFINER)
            );
        },

        'native_class_definition_builder': function () {
            return new NativeDefinitionBuilder(
                get(VALUE_FACTORY),
                get(FFI_FACTORY),
                get(NATIVE_METHOD_DEFINITION_BUILDER)
            );
        },

        'native_method_definition_builder': function () {
            return new NativeMethodDefinitionBuilder(get(FUNCTION_SIGNATURE_PARSER));
        },

        'opcode_executor': function () {
            return new OpcodeExecutor();
        },

        'opcode_factory': function () {
            return new OpcodeFactory(
                CalculationOpcode,
                ControlExpressionOpcode,
                ControlStructureOpcode,
                LoopStructureOpcode,
                UntracedOpcode,
                get(UNPAUSED_SENTINEL)
            );
        },

        'opcode_fetcher_repository': function () {
            var opcodePool = get(OPCODE_POOL);

            return new OpcodeFetcherRepository({
                'calculation': new CalculationOpcodeFetcher(opcodePool),
                'controlExpression': new ControlExpressionOpcodeFetcher(opcodePool),
                'controlStructure': new ControlStructureOpcodeFetcher(opcodePool),
                'loopStructure': new LoopStructureOpcodeFetcher(opcodePool)
            });
        },

        'opcode_handler_factory': function () {
            return new OpcodeHandlerFactory(
                get(CONTROL_BRIDGE),
                get(CALL_STACK),
                get(OPCODE_FETCHER_REPOSITORY),
                get(OPCODE_EXECUTOR),
                get(OPCODE_RESCUER),
                get(UNPAUSED_SENTINEL)
            );
        },

        'opcode_handler_typer': function () {
            return new OpcodeHandlerTyper(get(OPCODE_SIGNATURE_PARSER), get(TYPED_OPCODE_HANDLER_FACTORY));
        },

        'opcode_parameter_factory': function () {
            return new OpcodeParameterFactory(OpcodeParameter);
        },

        'opcode_pool': function () {
            return new OpcodePool(get(OPCODE_FACTORY));
        },

        'opcode_rescuer': function () {
            return new OpcodeRescuer(get(CONTROL_BRIDGE));
        },

        'opcode_signature_parser': function () {
            return new OpcodeSignatureParser(get(OPCODE_TYPE_PROVIDER), get(OPCODE_PARAMETER_FACTORY));
        },

        'opcode_type_factory': function () {
            return new OpcodeTypeFactory(
                get(VALUE_FACTORY),
                get(REFERENCE_FACTORY)
            );
        },

        'opcode_type_provider': function () {
            return new OpcodeTypeProvider(get(OPCODE_TYPE_FACTORY));
        },

        'output': function () {
            return new Output(get(OUTPUT_FACTORY), get(STDOUT_BUFFER));
        },

        'output_factory': function () {
            return new OutputFactory(OutputBuffer);
        },

        'return_type_provider': function () {
            return new ReturnTypeProvider(get(SPEC_TYPE_PROVIDER));
        },

        'spec_type_provider': function (set) {
            var typeFactory = get(TYPE_FACTORY),
                provider = set(new SpecTypeProvider(typeFactory));

            provider.addNamedProvider(new ArrayTypeProvider(typeFactory));
            provider.addNamedProvider(new CallableTypeProvider(typeFactory));
            provider.addNamedProvider(new ClassTypeProvider(typeFactory));
            provider.addNamedProvider(new IterableTypeProvider(typeFactory));
            provider.addNamedProvider(new MixedTypeProvider(typeFactory));
            provider.addNamedProvider(new NullTypeProvider(typeFactory));
            provider.addNamedProvider(new ObjectTypeProvider(typeFactory));
            provider.addNamedProvider(new ScalarTypeProvider(typeFactory));
            provider.addNamedProvider(new UnionTypeProvider(typeFactory, provider));
            provider.addNamedProvider(new VoidTypeProvider(typeFactory));
        },

        'stdout_buffer': function () {
            return new StdoutBuffer(get(STDOUT));
        },

        'translator': function () {
            return new Translator();
        },

        'type_factory': function () {
            return new TypeFactory(get(FUTURE_FACTORY), get(FLOW));
        },

        'typed_opcode_handler_factory': function () {
            return new TypedOpcodeHandlerFactory(
                get(CONTROL_BRIDGE)
            );
        },

        'unpaused_sentinel': function () {
            return new UnpausedSentinel();
        },

        'userland_class_definition_builder': function () {
            return new UserlandDefinitionBuilder(
                get(CALL_STACK),
                get(VALUE_FACTORY),
                get(FFI_FACTORY)
            );
        },

        'value_provider': function () {
            return new ValueProvider(
                get(VALUE_FACTORY),
                get(FFI_FACTORY),
                get(FLOW)
            );
        },

        'variable_factory': function () {
            return new VariableFactory(
                Variable,
                get(CALL_STACK),
                get(VALUE_FACTORY),
                get(REFERENCE_FACTORY),
                get(FUTURE_FACTORY),
                get(FLOW),
                get(GARBAGE_CACHE_INVALIDATOR)
            );
        }
    };
};
