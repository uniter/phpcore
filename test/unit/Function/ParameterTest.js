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
    FunctionContextInterface = require('../../../src/Function/FunctionContextInterface'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    Parameter = require('../../../src/Function/Parameter'),
    Translator = phpCommon.Translator,
    TypeInterface = require('../../../src/Type/TypeInterface'),
    Userland = require('../../../src/Control/Userland'),
    Variable = require('../../../src/Variable').sync();

describe('Parameter', function () {
    var callStack,
        context,
        createParameter,
        defaultValueProvider,
        flow,
        futureFactory,
        namespaceScope,
        parameter,
        state,
        translator,
        typeObject,
        userland,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState(null, {
            'call_stack': callStack
        });
        context = sinon.createStubInstance(FunctionContextInterface);
        defaultValueProvider = sinon.stub();
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        translator = sinon.createStubInstance(Translator);
        typeObject = sinon.createStubInstance(TypeInterface);
        userland = sinon.createStubInstance(Userland);
        valueFactory = state.getValueFactory();

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });
        translator.translate.callsFake(function (translationKey, placeholderVariables) {
            return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
        });
        userland.enterIsolated.callsFake(function (executor) {
            return valueFactory.maybeFuturise(executor);
        });

        createParameter = function (passedByReference) {
            parameter = new Parameter(
                callStack,
                translator,
                futureFactory,
                flow,
                userland,
                'myParam',
                6,
                typeObject,
                context,
                namespaceScope,
                Boolean(passedByReference),
                defaultValueProvider,
                '/path/to/my/module.php',
                101
            );
        };
        createParameter(true);
    });

    describe('coerceArgument()', function () {
        it('should return the argument unchanged when the parameter is passed by reference', function () {
            var variable = sinon.createStubInstance(Variable);

            expect(parameter.coerceArgument(variable)).to.equal(variable);
        });

        it('should return the argument\'s value when the parameter is passed by value', function () {
            var value = valueFactory.createString('my value'),
                variable = sinon.createStubInstance(Variable);
            typeObject.coerceValue.returnsArg(0);
            variable.getValue.returns(value);
            parameter = new Parameter(
                callStack,
                translator,
                futureFactory,
                flow,
                userland,
                'myParam',
                6,
                typeObject,
                context,
                namespaceScope,
                false,
                defaultValueProvider,
                '/path/to/my/module.php',
                101
            );

            expect(parameter.coerceArgument(variable)).to.equal(value);
        });
    });

    describe('getLineNumber()', function () {
        it('should return the line number', function () {
            expect(parameter.getLineNumber()).to.equal(101);
        });
    });

    describe('getName()', function () {
        it('should return the name of the parameter', function () {
            expect(parameter.getName()).to.equal('myParam');
        });
    });

    describe('getType()', function () {
        it('should return the type of the parameter', function () {
            expect(parameter.getType()).to.equal(typeObject);
        });
    });

    describe('isPassedByReference()', function () {
        it('should return true for a by-reference parameter', function () {
            expect(parameter.isPassedByReference()).to.be.true;
        });

        it('should return false for a by-value parameter', function () {
            createParameter(false);

            expect(parameter.isPassedByReference()).to.be.false;
        });
    });

    describe('populateDefaultArgument()', function () {
        it('should return the given argument reference when valid', async function () {
            var argumentReference = sinon.createStubInstance(Variable),
                argumentValue = valueFactory.createString('my arg');
            argumentReference.getValue.returns(argumentValue);
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(true);

            expect(await parameter.populateDefaultArgument(argumentReference).toPromise()).to.equal(argumentReference);
        });

        it('should return the given argument reference when null and parameter is typed but default is null', async function () {
            var argumentReference = sinon.createStubInstance(Variable),
                argumentValue = valueFactory.createNull(),
                defaultValue = valueFactory.createNull();
            argumentReference.getValue.returns(argumentValue);
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(false); // Type disallows null (eg. a class type not prefixed with ? in PHP7+)
            defaultValueProvider.returns(defaultValue); // Default is null, meaning null can be passed

            expect(await parameter.populateDefaultArgument(argumentReference).toPromise()).to.equal(argumentReference);
        });

        it('should create and return the default value from provider when optional and no argument given', async function () {
            var defaultValue = valueFactory.createString('my default value');
            defaultValueProvider.returns(defaultValue);
            typeObject.allowsValue
                .withArgs(sinon.match.same(defaultValue))
                .returns(true);

            expect(await parameter.populateDefaultArgument(null).toPromise()).to.equal(defaultValue);
        });
    });

    describe('isRequired()', function () {
        it('should return true when the parameter has no default value provider defined', function () {
            parameter = new Parameter(
                callStack,
                translator,
                futureFactory,
                flow,
                userland,
                'myParam',
                6,
                typeObject,
                context,
                namespaceScope,
                true,
                null,
                '/path/to/my/module.php',
                101
            );

            expect(parameter.isRequired()).to.be.true;
        });

        it('should return false when the parameter has a default value provider defined', function () {
            expect(parameter.isRequired()).to.be.false;
        });
    });

    describe('validateArgument()', function () {
        it('should raise an error when parameter expects a reference but a value was given as argument', function () {
            return expect(parameter.validateArgument(valueFactory.createString('my arg')).toPromise())
                .to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error for #core.only_variables_by_reference with {}'
                );
        });

        it('should raise an error when argument is non-null and not valid and context is given', function () {
            var argumentReference = sinon.createStubInstance(Variable),
                argumentValue = valueFactory.createString('my invalid argument'),
                defaultValue = valueFactory.createNull();
            argumentReference.getValueOrNull.returns(argumentValue);
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(futureFactory.createPresent(false)); // Type disallows null (eg. a class type not prefixed with ? in PHP7+)
            defaultValueProvider.returns(defaultValue); // Default is null, meaning null can be passed
            callStack.getCurrent.returns(sinon.createStubInstance(Call));
            callStack.getCallerFilePath.returns('/my/caller/module.php');
            callStack.getCallerLastLine.returns(12345);

            return expect(parameter.validateArgument(argumentReference).toPromise())
                .to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error for #core.invalid_value_for_type with {' +
                    '"index":7,' +
                    '"actualType":"string",' +
                    '"callerFile":"/my/caller/module.php",' +
                    '"callerLine":12345,' +
                    '"definitionFile":"/path/to/my/module.php",' +
                    '"definitionLine":101' +
                    '}'
                );
        });

        it('should raise an error when argument is non-null and not valid but context is not given', function () {
            var argumentReference = sinon.createStubInstance(Variable),
                argumentValue = valueFactory.createString('my invalid argument'),
                defaultValue = valueFactory.createNull();
            parameter = new Parameter(
                callStack,
                translator,
                futureFactory,
                flow,
                userland,
                'myParam',
                6,
                typeObject,
                context,
                namespaceScope,
                true,
                defaultValueProvider,
                null,
                null
            );
            argumentReference.getValueOrNull.returns(argumentValue);
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(futureFactory.createPresent(false)); // Type disallows null (eg. a class type not prefixed with ? in PHP7+)
            defaultValueProvider.returns(defaultValue); // Default is null, meaning null can be passed
            callStack.getCurrent.returns(sinon.createStubInstance(Call));
            callStack.getCallerFilePath.returns(null);
            callStack.getCallerLastLine.returns(null);

            return expect(parameter.validateArgument(argumentReference).toPromise())
                .to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error for #core.invalid_value_for_type with {' +
                    '"index":7,' +
                    '"actualType":"string",' +
                    '"callerFile":"[Translated] core.unknown {}",' +
                    '"callerLine":"[Translated] core.unknown {}",' +
                    '"definitionFile":"[Translated] core.unknown {}",' +
                    '"definitionLine":"[Translated] core.unknown {}"' +
                    '}'
                );
        });

        it('should raise an error when argument is null but type does not allow null and there is no default', function () {
            var argumentReference = sinon.createStubInstance(Variable),
                argumentValue = valueFactory.createNull();
            argumentReference.getValueOrNull.returns(argumentValue);
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(futureFactory.createPresent(false)); // Type disallows null (eg. a class type not prefixed with ? in PHP7+)
            callStack.getCurrent.returns(sinon.createStubInstance(Call));
            callStack.getCallerFilePath.returns('/my/caller/module.php');
            callStack.getCallerLastLine.returns(12345);
            parameter = new Parameter(
                callStack,
                translator,
                futureFactory,
                flow,
                userland,
                'myParam',
                6,
                typeObject,
                context,
                namespaceScope,
                true,
                null, // No default given, so null has not been allowed
                '/path/to/my/module.php',
                101
            );

            return expect(parameter.validateArgument(argumentReference).toPromise())
                .to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error for #core.invalid_value_for_type with {' +
                    '"index":7,' +
                    '"actualType":"null",' +
                    '"callerFile":"/my/caller/module.php",' +
                    '"callerLine":12345,' +
                    '"definitionFile":"/path/to/my/module.php",' +
                    '"definitionLine":101' +
                    '}'
                );
        });

        // An example would be a parameter of array type with a default value of an array literal
        it('should raise an error when argument is null but type does not allow null and default is not null', function () {
            var argumentReference = sinon.createStubInstance(Variable),
                argumentValue = valueFactory.createNull();
            argumentReference.getValueOrNull.returns(argumentValue);
            defaultValueProvider.returns(valueFactory.createArray(['some value']));
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(futureFactory.createPresent(false)); // Type disallows null (eg. a class type not prefixed with ? in PHP7+)
            callStack.getCurrent.returns(sinon.createStubInstance(Call));
            callStack.getCallerFilePath.returns('/my/caller/module.php');
            callStack.getCallerLastLine.returns(12345);

            return expect(parameter.validateArgument(argumentReference).toPromise())
                .to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error for #core.invalid_value_for_type with {' +
                    '"index":7,' +
                    '"actualType":"null",' +
                    '"callerFile":"/my/caller/module.php",' +
                    '"callerLine":12345,' +
                    '"definitionFile":"/path/to/my/module.php",' +
                    '"definitionLine":101' +
                    '}'
                );
        });

        it('should throw when parameter is required but no argument is given', function () {
            parameter = new Parameter(
                callStack,
                translator,
                futureFactory,
                flow,
                userland,
                'myParam',
                6,
                typeObject,
                context,
                namespaceScope,
                true,
                null, // Don't provide a default value, making the parameter required
                '/path/to/my/module.php',
                101
            );

            return expect(parameter.validateArgument(null).toPromise())
                .to.eventually.be.rejectedWith(
                    'Missing argument for required parameter "myParam"'
                );
        });
    });
});
