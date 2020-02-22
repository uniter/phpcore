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
    Call = require('../../../src/Call'),
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    FunctionContextInterface = require('../../../src/Function/FunctionContextInterface'),
    FunctionSpec = require('../../../src/Function/FunctionSpec'),
    Namespace = require('../../../src/Namespace').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    Parameter = require('../../../src/Function/Parameter'),
    Translator = phpCommon.Translator,
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('FunctionSpec', function () {
    var callStack,
        context,
        globalNamespace,
        parameter1,
        parameter2,
        spec,
        translator,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        context = sinon.createStubInstance(FunctionContextInterface);
        globalNamespace = sinon.createStubInstance(Namespace);
        parameter1 = sinon.createStubInstance(Parameter);
        parameter2 = sinon.createStubInstance(Parameter);
        translator = sinon.createStubInstance(Translator);
        valueFactory = new ValueFactory(null, null, null, translator);

        callStack.getCurrent.returns(sinon.createStubInstance(Call));
        callStack.getLastFilePath.returns('/path/to/my/module.php');
        callStack.getLastLine.returns(123);
        context.getName.returns('myFunction');
        parameter1.isRequired.returns(true);
        parameter2.isRequired.returns(false);
        translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });
        valueFactory.setGlobalNamespace(globalNamespace);

        spec = new FunctionSpec(
            callStack,
            valueFactory,
            context,
            [
                parameter1,
                parameter2
            ],
            '/path/to/my/module.php',
            1234
        );
    });

    describe('coerceArguments()', function () {
        it('should return the arguments unchanged', function () {
            var argument1 = valueFactory.createString('first uncoerced'),
                argument2 = valueFactory.createString('second uncoerced'),
                result = spec.coerceArguments([argument1, argument2]);

            expect(result).to.have.length(2);
            expect(result[0].getNative()).to.equal('first uncoerced');
            expect(result[1].getNative()).to.equal('second uncoerced');
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

        it('should return a new array of the populated argument values', function () {
            var result = spec.populateDefaultArguments([argument1, argument2]);

            expect(result).to.have.length(2);
            expect(result[0].getNative()).to.equal('first coerced');
            expect(result[1].getNative()).to.equal('second coerced');
        });

        it('should not throw when a required parameter is missing an argument, as this is handled by the validation step', function () {
            var errorClassObject = sinon.createStubInstance(Class),
                errorValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass
                .withArgs('ArgumentCountError')
                .returns(errorClassObject);
            errorClassObject.instantiate
                .returns(errorValue);
            parameter2.isRequired.returns(true);

            expect(function () {
                spec.populateDefaultArguments([argument1]);
            }).not.to.throw();
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

    describe('getUnprefixedFunctionName()', function () {
        it('should correctly fetch the name from the context', function () {
            context.getUnprefixedName
                .returns('myFunction');

            expect(spec.getUnprefixedFunctionName()).to.equal('myFunction');
        });
    });

    describe('validateArguments()', function () {
        var argument1,
            argument2;

        beforeEach(function () {
            argument1 = valueFactory.createString('first uncoerced');
            argument2 = valueFactory.createString('second uncoerced');
        });

        it('should throw the correct error when a required parameter is missing an argument', function () {
            var caughtError = null,
                errorClassObject = sinon.createStubInstance(Class),
                errorValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass
                .withArgs('ArgumentCountError')
                .returns(errorClassObject);
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
                spec.validateArguments([argument1]);
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).to.equal(errorValue);
        });
    });
});
