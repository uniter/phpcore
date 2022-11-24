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
    CalculationOpcode = require('../../Core/Opcode/Opcode/CalculationOpcode'),
    CalculationOpcodeFetcher = require('../../Core/Opcode/Fetcher/CalculationOpcodeFetcher'),
    Call = require('../../Call'),
    CallFactory = require('../../CallFactory'),
    CallStack = require('../../CallStack'),
    Chainifier = require('../../Control/Chain/Chainifier'),
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
    Future = require('../../Control/Future'),
    FutureFactory = require('../../Control/FutureFactory'),
    HostScheduler = require('../../Control/HostScheduler'),
    LoopStructureOpcode = require('../../Core/Opcode/Opcode/LoopStructureOpcode'),
    LoopStructureOpcodeFetcher = require('../../Core/Opcode/Fetcher/LoopStructureOpcodeFetcher'),
    MethodPromoter = require('../../Class/MethodPromoter'),
    NativeDefinitionBuilder = require('../../Class/Definition/NativeDefinitionBuilder'),
    NativeMethodDefinitionBuilder = require('../../Class/Definition/NativeMethodDefinitionBuilder'),
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
    ReturnTypeProvider = require('../../Function/ReturnTypeProvider'),
    SignatureParser = require('../../Function/Signature/SignatureParser'),
    SpecTypeProvider = require('../../Type/SpecTypeProvider'),
    Trace = require('../../Control/Trace'),
    Translator = phpCommon.Translator,
    TypeFactory = require('../../Type/TypeFactory'),
    TypedOpcodeHandlerFactory = require('../../Core/Opcode/Handler/TypedOpcodeHandlerFactory'),
    UnpausedSentinel = require('../../Core/Opcode/Handler/UnpausedSentinel'),
    UntracedOpcode = require('../../Core/Opcode/Opcode/UntracedOpcode'),
    Value = require('../../Value').sync(),
    ValueProvider = require('../../Value/ValueProvider'),
    Variable = require('../../Variable').sync(),
    VariableFactory = require('../../VariableFactory').sync(),

    ARRAY_CHAINIFIER = 'array_chainifier',
    CALL_STACK = 'call_stack',
    CHAINIFIER = 'chainifier',
    CONTROL_BRIDGE = 'control_bridge',
    CONTROL_SCOPE = 'control_scope',
    ELEMENT_PROVIDER_FACTORY = 'element_provider_factory',
    ERROR_REPORTING = 'error_reporting',
    FFI_FACTORY = 'ffi_factory',
    FLOW = 'flow',
    FUNCTION_FACTORY = 'function_factory',
    FUNCTION_SIGNATURE_PARSER = 'function_signature_parser',
    FUNCTION_SPEC_FACTORY = 'function_spec_factory',
    FUTURE_FACTORY = 'future_factory',
    NATIVE_METHOD_DEFINITION_BUILDER = 'native_method_definition_builder',
    OPCODE_EXECUTOR = 'opcode_executor',
    OPCODE_FACTORY = 'opcode_factory',
    OPCODE_FETCHER_REPOSITORY = 'opcode_fetcher_repository',
    OPCODE_HANDLER_FACTORY = 'opcode_handler_factory',
    OPCODE_PARAMETER_FACTORY = 'opcode_parameter_factory',
    OPCODE_POOL = 'opcode_pool',
    OPCODE_RESCUER = 'opcode_rescuer',
    OPCODE_SIGNATURE_PARSER = 'opcode_signature_parser',
    OPCODE_TYPE_FACTORY = 'opcode_type_factory',
    OPCODE_TYPE_PROVIDER = 'opcode_type_provider',
    PAUSE_FACTORY = 'pause_factory',
    REFERENCE_FACTORY = 'reference_factory',
    SPEC_TYPE_PROVIDER = 'spec_type_provider',
    STDERR = 'stderr',
    TRANSLATOR = 'translator',
    TYPE_FACTORY = 'type_factory',
    TYPED_OPCODE_HANDLER_FACTORY = 'typed_opcode_handler_factory',
    UNPAUSED_SENTINEL = 'unpaused_sentinel',
    VALUE_FACTORY = 'value_factory';

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
            return new CallFactory(Call, FFICall);
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

        'control_bridge': function () {
            return new ControlBridge(Future, Value);
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

        'function_signature_parser': function () {
            return new SignatureParser(get(VALUE_FACTORY));
        },

        'future_factory': function () {
            return new FutureFactory(
                get(PAUSE_FACTORY),
                get(VALUE_FACTORY),
                get(CONTROL_BRIDGE),
                get(CONTROL_SCOPE),
                Future
            );
        },

        'host_scheduler': function () {
            return new HostScheduler();
        },

        'method_promoter': function () {
            return new MethodPromoter(get(CALL_STACK), get(FUNCTION_FACTORY), get(FUNCTION_SPEC_FACTORY));
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

        'return_type_provider': function () {
            return new ReturnTypeProvider(get(SPEC_TYPE_PROVIDER));
        },

        'spec_type_provider': function () {
            return new SpecTypeProvider(get(TYPE_FACTORY));
        },

        'translator': function () {
            return new Translator();
        },

        'type_factory': function () {
            return new TypeFactory(get(FUTURE_FACTORY));
        },

        'typed_opcode_handler_factory': function () {
            return new TypedOpcodeHandlerFactory(
                get(CONTROL_BRIDGE),
                get(OPCODE_HANDLER_FACTORY)
            );
        },

        'unpaused_sentinel': function () {
            return new UnpausedSentinel();
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
                get(FLOW)
            );
        }
    };
};
