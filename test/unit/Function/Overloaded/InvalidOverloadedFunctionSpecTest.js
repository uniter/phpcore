/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var expect = require('chai').expect,
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    tools = require('../../tools'),
    CallStack = require('../../../../src/CallStack'),
    InvalidOverloadedFunctionSpec = require('../../../../src/Function/Overloaded/InvalidOverloadedFunctionSpec'),
    NamespaceScope = require('../../../../src/NamespaceScope').sync(),
    OverloadedFunctionSpec = require('../../../../src/Function/Overloaded/OverloadedFunctionSpec'),
    PHPError = phpCommon.PHPError,
    Translator = phpCommon.Translator;

describe('InvalidOverloadedFunctionSpec', function () {
    var callStack,
        createFunctionSpec,
        flow,
        functionSpec,
        namespaceScope,
        overloadedFunctionSpec,
        state,
        translator;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        callStack = sinon.createStubInstance(CallStack);
        flow = state.getFlow();
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        overloadedFunctionSpec = sinon.createStubInstance(OverloadedFunctionSpec);
        translator = sinon.createStubInstance(Translator);

        callStack.raiseTranslatedError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, translationKey, placeholderVariables, errorClass) {
                if (level !== PHPError.E_ERROR) {
                    return;
                }

                throw new Error(
                    'Fake PHP ' + level +
                    (errorClass ? ' (' + errorClass + ')' : '') +
                    ' for #' + translationKey +
                    ' with ' + JSON.stringify(placeholderVariables || {})
                );
            });

        overloadedFunctionSpec.getMinimumParameterCount.returns(1);
        overloadedFunctionSpec.getMaximumParameterCount.returns(3);

        translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });

        createFunctionSpec = function (argumentCount) {
            functionSpec = new InvalidOverloadedFunctionSpec(
                callStack,
                translator,
                flow,
                overloadedFunctionSpec,
                argumentCount
            );
        };
        createFunctionSpec(3);
    });

    describe('validateArguments()', function () {
        it('should raise an error when the argument count is below the minimum (<> 1)', function () {
            overloadedFunctionSpec.getMinimumParameterCount.returns(4);
            overloadedFunctionSpec.getMaximumParameterCount.returns(6);

            expect(function () {
                functionSpec.validateArguments();
            }).to.throw(
                'Fake PHP Fatal error (ArgumentCountError) for #core.wrong_arg_count_builtin ' +
                'with {' +
                '"bound":"[Translated] core.at_least {}",' +
                '"expectedCount":4,' +
                '"actualCount":3,' +
                '"callerFile":"([Translated] core.unknown {})",' +
                '"callerLine":"([Translated] core.unknown {})"' +
                '}'
            );
        });

        it('should raise an error when the argument count is below the minimum (of 1)', function () {
            createFunctionSpec(0);
            overloadedFunctionSpec.getMinimumParameterCount.returns(1);
            overloadedFunctionSpec.getMaximumParameterCount.returns(3);

            expect(function () {
                functionSpec.validateArguments();
            }).to.throw(
                'Fake PHP Fatal error (ArgumentCountError) for #core.wrong_arg_count_builtin_single ' +
                'with {' +
                '"bound":"[Translated] core.at_least {}",' +
                '"expectedCount":1,' +
                '"actualCount":0,' +
                '"callerFile":"([Translated] core.unknown {})",' +
                '"callerLine":"([Translated] core.unknown {})"' +
                '}'
            );
        });

        it('should raise an error when the argument count is above the maximum (<> 1)', function () {
            overloadedFunctionSpec.getMinimumParameterCount.returns(0);
            overloadedFunctionSpec.getMaximumParameterCount.returns(2);

            expect(function () {
                functionSpec.validateArguments();
            }).to.throw(
                'Fake PHP Fatal error (ArgumentCountError) for #core.wrong_arg_count_builtin ' +
                'with {' +
                '"bound":"[Translated] core.at_most {}",' +
                '"expectedCount":2,' +
                '"actualCount":3,' +
                '"callerFile":"([Translated] core.unknown {})",' +
                '"callerLine":"([Translated] core.unknown {})"' +
                '}'
            );
        });

        it('should raise an error when the argument count is above the maximum (of 1)', function () {
            overloadedFunctionSpec.getMinimumParameterCount.returns(0);
            overloadedFunctionSpec.getMaximumParameterCount.returns(1);

            expect(function () {
                functionSpec.validateArguments();
            }).to.throw(
                'Fake PHP Fatal error (ArgumentCountError) for #core.wrong_arg_count_builtin_single ' +
                'with {' +
                '"bound":"[Translated] core.at_most {}",' +
                '"expectedCount":1,' +
                '"actualCount":3,' +
                '"callerFile":"([Translated] core.unknown {})",' +
                '"callerLine":"([Translated] core.unknown {})"' +
                '}'
            );
        });

        // This can happen when there are overloads defined for argument counts 1 and 3,
        // but no variant defined for an argument count of 2, for example.
        it('should raise an error when the argument count is between min and max', function () {
            overloadedFunctionSpec.getMinimumParameterCount.returns(1);
            overloadedFunctionSpec.getMaximumParameterCount.returns(4);

            expect(function () {
                functionSpec.validateArguments();
            }).to.throw(
                'Fake PHP Fatal error (ArgumentCountError) for #core.no_overload_variant_for_parameter_count ' +
                'with {"parameterCount":3}'
            );
        });
    });
});
