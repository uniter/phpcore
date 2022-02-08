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
    tools = require('../tools'),
    Call = require('../../../src/Call'),
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    FunctionContextInterface = require('../../../src/Function/FunctionContextInterface'),
    FunctionFactory = require('../../../src/FunctionFactory').sync(),
    FunctionSpec = require('../../../src/Function/FunctionSpec'),
    FunctionSpecFactory = require('../../../src/Function/FunctionSpecFactory'),
    Namespace = require('../../../src/Namespace').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    Parameter = require('../../../src/Function/Parameter'),
    PHPError = phpCommon.PHPError,
    TypeInterface = require('../../../src/Type/TypeInterface'),
    Translator = phpCommon.Translator,
    Variable = require('../../../src/Variable').sync();

describe('FunctionSpec', function () {
    var callStack,
        context,
        createSpec,
        flow,
        futureFactory,
        globalNamespace,
        namespaceScope,
        parameter1,
        parameter2,
        parameterList,
        returnType,
        spec,
        state,
        translator,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        translator = sinon.createStubInstance(Translator);
        state = tools.createIsolatedState(null, {
            'call_stack': callStack,
            'translator': translator
        });
        context = sinon.createStubInstance(FunctionContextInterface);
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        globalNamespace = sinon.createStubInstance(Namespace);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        parameter1 = sinon.createStubInstance(Parameter);
        parameter2 = sinon.createStubInstance(Parameter);
        parameterList = [parameter1, parameter2];
        returnType = sinon.createStubInstance(TypeInterface);
        valueFactory = state.getValueFactory();

        callStack.getCurrent.returns(sinon.createStubInstance(Call));
        callStack.getLastFilePath.returns('/path/to/my/module.php');
        callStack.getLastLine.returns(123);
        callStack.raiseTranslatedError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, translationKey, placeholderVariables) {
                throw new Error(
                    'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
                );
            });
        context.getName.returns('myFunction');
        parameter1.isPassedByReference.returns(false);
        parameter1.isRequired.returns(true);
        parameter2.isPassedByReference.returns(false);
        parameter2.isRequired.returns(false);
        returnType.getDisplayName.returns('float');
        translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });
        valueFactory.setGlobalNamespace(globalNamespace);

        createSpec = function (returnByReference) {
            spec = new FunctionSpec(
                callStack,
                valueFactory,
                futureFactory,
                flow,
                context,
                namespaceScope,
                parameterList,
                returnType,
                returnByReference,
                '/path/to/my/module.php',
                1234
            );
        };
        createSpec(false);
    });

    describe('coerceArguments()', function () {
        var argument1,
            argument2;

        beforeEach(function () {
            argument1 = valueFactory.createString('first uncoerced');
            argument2 = valueFactory.createString('second uncoerced');

            parameter1.coerceArgument
                .withArgs(sinon.match.same(argument1))
                .returns(valueFactory.createString('first coerced'));
            parameter2.coerceArgument
                .withArgs(sinon.match.same(argument2))
                .returns(valueFactory.createString('second coerced'));
        });

        it('should return a new array of the coerced arguments', function () {
            var result = spec.coerceArguments([argument1, argument2]);

            expect(result).to.have.length(2);
            expect(result[0].getNative()).to.equal('first coerced');
            expect(result[1].getNative()).to.equal('second coerced');
        });

        it('should skip any parameters whose specs are missing', function () {
            var result;
            parameterList[0] = null; // Missing parameter spec, eg. due to bundle size optimisations.
            createSpec(false);

            result = spec.coerceArguments([argument1, argument2]);

            expect(result).to.have.length(2);
            expect(result[0].getNative()).to.equal('first uncoerced');
            expect(result[1].getNative()).to.equal('second coerced');
        });

        it('should skip any parameters that have no argument provided', function () {
            var result;
            // Make all parameters required, to ensure this is not taken into account
            // at this stage (should be handled later on, when validating)
            parameter2.isRequired.returns(true);

            result = spec.coerceArguments([argument1]);

            expect(result).to.have.length(1);
            expect(result[0].getNative()).to.equal('first coerced');
        });

        it('should not overwrite by-reference arguments in the reference list with their resolved values', function () {
            var argumentReferences,
                result;
            argumentReferences = [argument1, argument2];
            parameter1.isPassedByReference.returns(true);

            result = spec.coerceArguments(argumentReferences);

            expect(result).to.have.length(2);
            expect(result[0].getNative()).to.equal('first coerced');
            expect(result[1].getNative()).to.equal('second coerced');
            expect(argumentReferences).to.have.length(2);
            // Not overwritten, as we need to preserve the reference to pass through.
            expect(argumentReferences[0].getNative()).to.equal('first uncoerced');
            expect(argumentReferences[1].getNative()).to.equal('second coerced');
        });
    });

    describe('coerceReturnReference()', function () {
        it('should return the coerced result when the function is return-by-reference', async function () {
            var originalValue = valueFactory.createString('original value'),
                coercedValue = valueFactory.createString('coerced value'),
                variable = sinon.createStubInstance(Variable);
            createSpec(true);
            returnType.coerceValue
                .withArgs(sinon.match.same(originalValue))
                .returns(coercedValue);
            variable.getValueOrNull.returns(originalValue);

            expect(await spec.coerceReturnReference(variable).toPromise()).to.equal(coercedValue);
        });

        it('should write the coerced result back to the reference when the function is return-by-reference', async function () {
            var originalValue = valueFactory.createString('original value'),
                coercedValue = valueFactory.createString('coerced value'),
                variable = sinon.createStubInstance(Variable);
            createSpec(true);
            returnType.coerceValue
                .withArgs(sinon.match.same(originalValue))
                .returns(coercedValue);
            variable.getValueOrNull.returns(originalValue);

            await spec.coerceReturnReference(variable).toPromise();

            expect(variable.setValue).to.have.been.calledOnce;
            expect(variable.setValue).to.have.been.calledWith(sinon.match.same(coercedValue));
        });

        it('should return the result value when the function is return-by-value', function () {
            var value = valueFactory.createString('my value'),
                variable = sinon.createStubInstance(Variable);
            returnType.coerceValue.returnsArg(0);
            variable.getValue.returns(value);

            expect(spec.coerceReturnReference(variable)).to.equal(value);
        });
    });

    describe('createAliasFunction()', function () {
        var aliasFunction,
            aliasFunctionSpec,
            functionFactory,
            functionSpecFactory,
            originalFunction;

        beforeEach(function () {
            aliasFunction = sinon.stub();
            aliasFunctionSpec = sinon.createStubInstance(FunctionSpec);
            functionFactory = sinon.createStubInstance(FunctionFactory);
            functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
            originalFunction = sinon.stub();

            functionFactory.create
                .withArgs(
                    sinon.match.same(namespaceScope),
                    null, // Class (always null for normal functions)
                    sinon.match.same(originalFunction),
                    'myAliasFunc',
                    null,
                    null,
                    sinon.match.same(aliasFunctionSpec)
                )
                .returns(aliasFunction);

            functionSpecFactory.createAliasFunctionSpec
                .withArgs(
                    sinon.match.same(namespaceScope),
                    'myAliasFunc',
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    sinon.match.same(returnType),
                    false, // Return by value.
                    '/path/to/my/module.php',
                    1234
                )
                .returns(aliasFunctionSpec);
        });

        it('should return a correctly constructed alias function', function () {
            expect(
                spec.createAliasFunction(
                    'myAliasFunc',
                    originalFunction,
                    functionSpecFactory,
                    functionFactory
                )
            ).to.equal(aliasFunction);
        });
    });

    describe('populateDefaultArguments()', function () {
        var argument1,
            argument2;

        beforeEach(function () {
            argument1 = valueFactory.createString('first uncoerced');
            argument2 = valueFactory.createString('second uncoerced');

            parameter1.populateDefaultArgument
                .withArgs(sinon.match.same(argument1))
                .returns(valueFactory.createString('first coerced'));
            parameter2.populateDefaultArgument
                .withArgs(sinon.match.same(argument2))
                .returns(valueFactory.createString('second coerced'));
        });

        it('should return a new array of the populated argument values', async function () {
            var result = await spec.populateDefaultArguments([argument1, argument2]).toPromise();

            expect(result).to.have.length(2);
            expect(result[0].getNative()).to.equal('first coerced');
            expect(result[1].getNative()).to.equal('second coerced');
        });

        it('should not throw when a required parameter is missing an argument, as this is handled by the validation step', function () {
            var errorClassObject = sinon.createStubInstance(Class),
                errorValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass
                .withArgs('ArgumentCountError')
                .returns(futureFactory.createPresent(errorClassObject));
            errorClassObject.instantiate
                .returns(errorValue);
            parameter2.isRequired.returns(true);

            return expect(spec.populateDefaultArguments([argument1]).toPromise()).not.to.be.rejected;
        });

        it('should provide special line number instrumentation for the current parameter', async function () {
            var lineNumber;
            parameter2.getLineNumber.returns(1234);
            parameter2.populateDefaultArgument
                .withArgs(sinon.match.same(argument2))
                .callsFake(function () {
                    // Read the line number for the current parameter via instrumentation
                    lineNumber = callStack.instrumentCurrent.args[0][0]();

                    return futureFactory.createPresent(argument2);
                });

            await spec.populateDefaultArguments([argument1, argument2]).toPromise();

            expect(lineNumber).to.equal(1234);
        });
    });

    describe('getFunctionName()', function () {
        it('should correctly fetch the name from the context for a static call', function () {
            context.getName
                .withArgs(true)
                .returns('myFunction');

            expect(spec.getFunctionName(true)).to.equal('myFunction');
        });

        it('should correctly fetch the name from the context for an instance call', function () {
            context.getName
                .withArgs(false)
                .returns('myFunction');

            expect(spec.getFunctionName(false)).to.equal('myFunction');
        });
    });

    describe('getFunctionTraceFrameName()', function () {
        it('should correctly fetch the name from the context for a static call', function () {
            context.getTraceFrameName
                .withArgs(true)
                .returns('myFunction');

            expect(spec.getFunctionTraceFrameName(true)).to.equal('myFunction');
        });

        it('should correctly fetch the name from the context for an instance call', function () {
            context.getTraceFrameName
                .withArgs(false)
                .returns('myFunction');

            expect(spec.getFunctionTraceFrameName(false)).to.equal('myFunction');
        });
    });

    describe('getParameterByPosition()', function () {
        it('should return the parameter at the given position', function () {
            expect(spec.getParameterByPosition(1)).to.equal(parameter2);
        });

        it('should throw when an invalid position is given', function () {
            expect(function () {
                spec.getParameterByPosition(12);
            }.bind(this)).to.throw('Unable to fetch parameter #12 of function "myFunction"');
        });
    });

    describe('getParameters()', function () {
        it('should return all parameters', function () {
            var parameters = spec.getParameters();

            expect(parameters).to.have.length(2);
            expect(parameters[0]).to.equal(parameter1);
            expect(parameters[1]).to.equal(parameter2);
        });
    });

    describe('getUnprefixedFunctionName()', function () {
        it('should correctly fetch the name from the context', function () {
            context.getUnprefixedName
                .returns('myFunction');

            expect(spec.getUnprefixedFunctionName()).to.equal('myFunction');
        });
    });

    describe('validateArguments()', function () {
        var argumentReference1,
            argumentReference2,
            argumentValue1,
            argumentValue2;

        beforeEach(function () {
            argumentReference1 = sinon.createStubInstance(Variable);
            argumentReference2 = sinon.createStubInstance(Variable);

            argumentValue1 = valueFactory.createString('first uncoerced');
            argumentValue2 = valueFactory.createString('second uncoerced');
        });

        it('should validate the arguments', function () {
            spec.validateArguments([argumentReference1, argumentReference2], [argumentValue1, argumentValue2])
                .yieldSync();

            expect(parameter1.validateArgument).to.have.been.calledOnce;
            expect(parameter1.validateArgument).to.have.been.calledWith(
                sinon.match.same(argumentReference1),
                sinon.match.same(argumentValue1)
            );
            expect(parameter2.validateArgument).to.have.been.calledOnce;
            expect(parameter2.validateArgument).to.have.been.calledWith(
                sinon.match.same(argumentReference2),
                sinon.match.same(argumentValue2)
            );
        });

        it('should throw the correct error when a required parameter is missing an argument', function () {
            var caughtError = null,
                errorClassObject = sinon.createStubInstance(Class),
                errorValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass
                .withArgs('ArgumentCountError')
                .returns(futureFactory.createPresent(errorClassObject));
            errorClassObject.instantiate
                .withArgs([
                    sinon.match(function (arg) {
                        return arg.getNative() === '[Translated] core.too_few_args_for_exact_count {"func":"myFunction","expectedCount":2,"actualCount":1}';
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === 0;
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === null;
                    })
                ])
                .returns(errorValue);
            parameter2.isRequired.returns(true);

            try {
                spec.validateArguments([argumentReference1], [argumentValue1]).yieldSync();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).to.equal(errorValue);
        });
    });

    describe('validateReturnReference()', function () {
        var returnReference,
            returnValue;

        beforeEach(function () {
            returnReference = sinon.createStubInstance(Variable);
            returnValue = valueFactory.createString('my return value');
        });

        describe('when the spec has a return type, is return-by-value and the return value is allowed', function () {
            beforeEach(function () {
                returnReference.isReferenceable.returns(false);
                returnType.allowsValue
                    .withArgs(sinon.match.same(returnValue))
                    .returns(futureFactory.createPresent(true));
            });

            it('should return the return value', async function () {
                expect(await spec.validateReturnReference(returnReference, returnValue).toPromise())
                    .to.equal(returnValue);
            });

            it('should not raise an error', async function () {
                await spec.validateReturnReference(returnReference, returnValue).toPromise();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });

        describe('when the spec has a return type, is return-by-reference and the return value is allowed', function () {
            beforeEach(function () {
                createSpec(true);
                returnReference.isReferenceable.returns(true);
                returnType.allowsValue
                    .withArgs(sinon.match.same(returnValue))
                    .returns(futureFactory.createPresent(true));
            });

            it('should return the return reference', async function () {
                expect(await spec.validateReturnReference(returnReference, returnValue).toPromise())
                    .to.equal(returnReference);
            });

            it('should not raise an error', async function () {
                await spec.validateReturnReference(returnReference, returnValue).toPromise();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });

        describe('when the spec has a return type, is return-by-value but the return value is not allowed', function () {
            beforeEach(function () {
                returnReference.isReferenceable.returns(false);
                returnType.allowsValue
                    .withArgs(sinon.match.same(returnValue))
                    .returns(futureFactory.createPresent(false));
            });

            it('should reject the future with an error', function () {
                return expect(spec.validateReturnReference(returnReference, returnValue).toPromise())
                    .to.eventually.be.rejectedWith(
                        'Fake PHP Fatal error for #core.invalid_return_value_type ' +
                        'with {"func":"myFunction","expectedType":"float","actualType":"string"}'
                    );
            });

            it('should raise an error', async function () {
                try {
                    await spec.validateReturnReference(returnReference, returnValue).toPromise();
                } catch (error) {}

                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_ERROR,
                    'core.invalid_return_value_type',
                    {
                        func: 'myFunction',
                        expectedType: 'float',
                        actualType: 'string'
                    },
                    'TypeError',
                    false,
                    '/path/to/my/module.php',
                    1234
                );
            });
        });

        describe('when the spec has a return type, is return-by-reference but the return value is not allowed', function () {
            beforeEach(function () {
                createSpec(true);
                returnReference.isReferenceable.returns(true);
                returnType.allowsValue
                    .withArgs(sinon.match.same(returnValue))
                    .returns(futureFactory.createPresent(false));
            });

            it('should reject the future with an error', function () {
                return expect(spec.validateReturnReference(returnReference, returnValue).toPromise())
                    .to.eventually.be.rejectedWith(
                        'Fake PHP Fatal error for #core.invalid_return_value_type ' +
                        'with {"func":"myFunction","expectedType":"float","actualType":"string"}'
                    );
            });

            it('should raise an error', async function () {
                try {
                    await spec.validateReturnReference(returnReference, returnValue).toPromise();
                } catch (error) {}

                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_ERROR,
                    'core.invalid_return_value_type',
                    {
                        func: 'myFunction',
                        expectedType: 'float',
                        actualType: 'string'
                    },
                    'TypeError',
                    false,
                    '/path/to/my/module.php',
                    1234
                );
            });
        });

        describe('when the spec is return-by-reference but a non-reference is returned', function () {
            beforeEach(function () {
                createSpec(true);
                returnReference.isReferenceable.returns(false);
                returnType.allowsValue
                    .withArgs(sinon.match.same(returnValue))
                    .returns(futureFactory.createPresent(true));
            });

            it('should return the return reference', async function () {
                expect(await spec.validateReturnReference(returnReference, returnValue).toPromise())
                    .to.equal(returnReference);
            });

            it('should raise a notice', async function () {
                await spec.validateReturnReference(returnReference, returnValue).toPromise();

                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'core.only_references_returned_by_reference'
                );
            });
        });

        describe('when the spec is return-by-value and has no return type', function () {
            beforeEach(function () {
                returnType = null;
                createSpec(false);
            });

            it('should return the return value unchanged', async function () {
                expect(await spec.validateReturnReference(returnReference, returnValue).toPromise())
                    .to.equal(returnValue);
            });

            it('should not raise an error', async function () {
                await spec.validateReturnReference(returnReference, returnValue).toPromise();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });

        describe('when the spec is return-by-reference and has no return type', function () {
            beforeEach(function () {
                returnType = null;
                createSpec(true);
            });

            it('should return the return reference unchanged', async function () {
                expect(await spec.validateReturnReference(returnReference, returnValue).toPromise())
                    .to.equal(returnReference);
            });

            it('should not raise an error', async function () {
                await spec.validateReturnReference(returnReference, returnValue).toPromise();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });
    });
});
