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
    SignatureParser = require('../../Function/Signature/SignatureParser'),
    Translator = phpCommon.Translator,

    ERROR_REPORTING = 'error_reporting',
    STDERR = 'stderr',
    TRANSLATOR = 'translator',
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

        'translator': function () {
            return new Translator();
        }
    };
};
