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
    Call = require('../../Call'),
    CallFactory = require('../../CallFactory'),
    CallStack = require('../../CallStack'),
    ControlScope = require('../../Control/ControlScope'),
    FFICall = require('../../FFI/Call'),
    ReturnTypeProvider = require('../../Function/ReturnTypeProvider'),
    SignatureParser = require('../../Function/Signature/SignatureParser'),
    SpecTypeProvider = require('../../Type/SpecTypeProvider'),
    Translator = phpCommon.Translator,
    TypeFactory = require('../../Type/TypeFactory'),

    ERROR_REPORTING = 'error_reporting',
    FUTURE_FACTORY = 'future_factory',
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

        'control_scope': function () {
            return new ControlScope();
        },

        'function_signature_parser': function () {
            return new SignatureParser(get(VALUE_FACTORY));
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
        }
    };
};
