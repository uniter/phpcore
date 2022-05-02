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
    CalculationOpcode = require('../../Core/Opcode/Opcode/CalculationOpcode'),
    CalculationOpcodeFetcher = require('../../Core/Opcode/Fetcher/CalculationOpcodeFetcher'),
    Call = require('../../Call'),
    CallFactory = require('../../CallFactory'),
    CallStack = require('../../CallStack'),
    ControlBridge = require('../../Control/ControlBridge'),
    ControlExpressionOpcode = require('../../Core/Opcode/Opcode/ControlExpressionOpcode'),
    ControlExpressionOpcodeFetcher = require('../../Core/Opcode/Fetcher/ControlExpressionOpcodeFetcher'),
    ControlScope = require('../../Control/ControlScope'),
    ControlStructureOpcode = require('../../Core/Opcode/Opcode/ControlStructureOpcode'),
    ControlStructureOpcodeFetcher = require('../../Core/Opcode/Fetcher/ControlStructureOpcodeFetcher'),
    FFICall = require('../../FFI/Call'),
    Future = require('../../Control/Future'),
    FutureValue = require('../../Value/Future'),
    LoopStructureOpcode = require('../../Core/Opcode/Opcode/LoopStructureOpcode'),
    LoopStructureOpcodeFetcher = require('../../Core/Opcode/Fetcher/LoopStructureOpcodeFetcher'),
    MethodPromoter = require('../../Class/MethodPromoter'),
    NativeDefinitionBuilder = require('../../Class/Definition/NativeDefinitionBuilder'),
    NativeMethodDefinitionBuilder = require('../../Class/Definition/NativeMethodDefinitionBuilder'),
    OpcodeExecutor = require('../../Core/Opcode/Handler/OpcodeExecutor'),
    OpcodeFactory = require('../../Core/Opcode/Opcode/OpcodeFactory'),
    OpcodeFetcherRepository = require('../../Core/Opcode/Fetcher/OpcodeFetcherRepository'),
    OpcodeHandlerFactory = require('../../Core/Opcode/Handler/OpcodeHandlerFactory'),
    OpcodePool = require('../../Core/Opcode/Opcode/OpcodePool'),
    OpcodeRescuer = require('../../Core/Opcode/Handler/OpcodeRescuer'),
    ReturnTypeProvider = require('../../Function/ReturnTypeProvider'),
    SignatureParser = require('../../Function/Signature/SignatureParser'),
    SpecTypeProvider = require('../../Type/SpecTypeProvider'),
    Translator = phpCommon.Translator,
    TypeFactory = require('../../Type/TypeFactory'),
    UntracedOpcode = require('../../Core/Opcode/Opcode/UntracedOpcode'),
    Value = require('../../Value').sync(),
    ValueProvider = require('../../Value/ValueProvider'),

    CALL_STACK = 'call_stack',
    CONTROL_BRIDGE = 'control_bridge',
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
    OPCODE_POOL = 'opcode_pool',
    OPCODE_RESCUER = 'opcode_rescuer',
    SPEC_TYPE_PROVIDER = 'spec_type_provider',
    STDERR = 'stderr',
    TRANSLATOR = 'translator',
    TYPE_FACTORY = 'type_factory',
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

        'control_bridge': function () {
            return new ControlBridge(Future, FutureValue, Value);
        },

        'control_scope': function () {
            return new ControlScope();
        },

        'function_signature_parser': function () {
            return new SignatureParser(get(VALUE_FACTORY));
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
                UntracedOpcode
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
                get(OPCODE_RESCUER)
            );
        },

        'opcode_pool': function () {
            return new OpcodePool(get(OPCODE_FACTORY));
        },

        'opcode_rescuer': function () {
            return new OpcodeRescuer(get(CONTROL_BRIDGE));
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

        'value_provider': function () {
            return new ValueProvider(
                get(VALUE_FACTORY),
                get(FLOW)
            );
        }
    };
};
