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
    Exception = phpCommon.Exception,
    FunctionContextInterface = require('../../../src/Function/FunctionContextInterface'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    Parameter = require('../../../src/Function/Parameter'),
    Reference = require('../../../src/Reference/Reference'),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    Scope = require('../../../src/Scope').sync(),
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
        valueFactory,
        variableFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
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
        variableFactory = state.getService('variable_factory');

        callStack.getCallerFilePath.returns(null);
        callStack.getCallerLastLine.returns(null);
        callStack.isStrictTypesMode.returns(false);
        callStack.isUserland.returns(false);
        callStack.raiseTranslatedError.callsFake(function (
            level,
            translationKey,
            placeholderVariables,
            errorClass,
            reportsOwnContext,
            filePath,
            lineNumber,
            contextTranslationKey,
            contextPlaceholderVariables,
            skipCurrentStackFrame
        ) {
            throw new Error(
                'Fake PHP ' + level + ' [' + errorClass +
                '] for #' + translationKey +
                ' with ' + JSON.stringify(placeholderVariables || {}) +
                ' reportsOwnContext=' + (reportsOwnContext ? 'yes' : 'no') +
                (
                    contextTranslationKey ?
                        ' context(#' + contextTranslationKey +
                        ' with ' + JSON.stringify(contextPlaceholderVariables || {}) +
                        ')' :
                        ''
                ) +
                ' skipCurrentStackFrame=' + (skipCurrentStackFrame ? 'yes' : 'no') +
                ' @ ' + filePath + ':' + lineNumber
            );
        });
        translator.translate.callsFake(function (translationKey, placeholderVariables) {
            return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
        });
        userland.enterIsolated.callsFake(function (executor) {
            return flow.maybeFuturise(executor);
        });

        createParameter = function (passedByReference) {
            parameter = new Parameter(
                callStack,
                valueFactory,
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
        it('should return the coerced argument when the parameter is passed by reference', async function () {
            var originalValue = valueFactory.createString('original value'),
                coercedValue = valueFactory.createString('coerced value'),
                setValue = valueFactory.createString('set value'),
                variable = sinon.createStubInstance(Variable);
            typeObject.coerceValue
                .withArgs(sinon.match.same(originalValue))
                .returns(futureFactory.createPresent(coercedValue));
            variable.getValueOrNull.returns(originalValue);
            variable.setValue
                .withArgs(sinon.match.same(coercedValue))
                .returns(setValue);

            expect(await parameter.coerceArgument(variable).toPromise()).to.equal(setValue);
        });

        it('should write the coerced argument back to the reference when the parameter is passed by reference', async function () {
            var originalValue = valueFactory.createString('original value'),
                coercedValue = valueFactory.createString('coerced value'),
                setValue = valueFactory.createString('set value'),
                variable = sinon.createStubInstance(Variable);
            typeObject.coerceValue
                .withArgs(sinon.match.same(originalValue))
                .returns(futureFactory.createPresent(coercedValue));
            variable.getValueOrNull.returns(originalValue);
            variable.setValue
                .withArgs(sinon.match.same(coercedValue))
                .returns(setValue);

            await parameter.coerceArgument(variable).toPromise();

            expect(variable.setValue).to.have.been.calledOnce;
            expect(variable.setValue).to.have.been.calledWith(sinon.match.same(coercedValue));
        });

        it('should return the argument\'s value when the parameter is passed by value', async function () {
            var value = valueFactory.createString('my value'),
                variable = sinon.createStubInstance(Variable);
            typeObject.coerceValue.callsFake(function (value) {
                return futureFactory.createPresent(value);
            });
            variable.getValue.returns(value);
            createParameter(false);

            expect(await parameter.coerceArgument(variable).toPromise()).to.equal(value);
        });

        it('should not coerce in strict types mode', async function () {
            var value = valueFactory.createString('my value'),
                variable = sinon.createStubInstance(Variable);
            callStack.isStrictTypesMode.returns(true);
            // Stub anyway despite not being expected, so that test would fail gracefully.
            typeObject.coerceValue.callsFake(function (value) {
                return futureFactory.createPresent(value);
            });
            variable.getValue.returns(value);
            createParameter(false);

            expect(await parameter.coerceArgument(variable).toPromise()).to.equal(value);
            expect(typeObject.coerceValue).not.to.have.been.called;
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

    describe('loadArgument()', function () {
        var argumentReference,
            argumentReferenceSlot,
            argumentValue,
            localVariable,
            scope;

        beforeEach(function () {
            scope = sinon.createStubInstance(Scope);
            argumentReference = sinon.createStubInstance(Reference);
            argumentReferenceSlot = sinon.createStubInstance(ReferenceSlot);
            argumentValue = valueFactory.createString('my argument');

            argumentReference.getReference.returns(argumentReferenceSlot);
            argumentReference.getValue.returns(argumentValue);

            scope.getVariable.callsFake(function (name) {
                localVariable = sinon.createStubInstance(Variable);
                localVariable.getName.returns(name);

                return localVariable;
            });
        });

        describe('when passed by value', function () {
            beforeEach(function () {
                createParameter(false);
            });

            it('should declare the local variable', function () {
                parameter.loadArgument(argumentReference, scope);

                expect(scope.getVariable).to.have.been.calledOnce;
                expect(scope.getVariable).to.have.been.calledWith('myParam');
            });

            it('should set the value of the local variable to the value of the reference', function () {
                parameter.loadArgument(argumentReference, scope);

                expect(localVariable.setValue).to.have.been.calledOnce;
                expect(localVariable.setValue.args[0][0].getNative()).to.equal('my argument');
            });

            it('should not set the reference of the local variable', function () {
                parameter.loadArgument(argumentReference, scope);

                expect(localVariable.setReference).not.to.have.been.called;
            });
        });

        describe('when passed by reference with no default value', function () {
            beforeEach(function () {
                defaultValueProvider = null;
                createParameter(true);
            });

            it('should declare the local variable', function () {
                parameter.loadArgument(argumentReference, scope);

                expect(scope.getVariable).to.have.been.calledOnce;
                expect(scope.getVariable).to.have.been.calledWith('myParam');
            });

            it('should set the reference of the local variable to the reference slot', function () {
                parameter.loadArgument(argumentReference, scope);

                expect(localVariable.setReference).to.have.been.calledOnce;
                expect(localVariable.setReference).to.have.been.calledWith(
                    sinon.match.same(argumentReferenceSlot)
                );
            });

            it('should not set the value of the local variable', function () {
                parameter.loadArgument(argumentReference, scope);

                expect(localVariable.setValue).not.to.have.been.called;
            });
        });

        describe('when passed by reference with a default value, value given', function () {
            beforeEach(function () {
                createParameter(true);
            });

            it('should declare the local variable', function () {
                parameter.loadArgument(argumentValue, scope);

                expect(scope.getVariable).to.have.been.calledOnce;
                expect(scope.getVariable).to.have.been.calledWith('myParam');
            });

            it('should set the value of the local variable to the value', function () {
                parameter.loadArgument(argumentValue, scope);

                expect(localVariable.setValue).to.have.been.calledOnce;
                expect(localVariable.setValue.args[0][0].getNative()).to.equal('my argument');
            });

            it('should not set the reference of the local variable', function () {
                parameter.loadArgument(argumentValue, scope);

                expect(localVariable.setReference).not.to.have.been.called;
            });
        });

        describe('when passed by reference with a default value, reference given', function () {
            beforeEach(function () {
                createParameter(true);
            });

            it('should declare the local variable', function () {
                parameter.loadArgument(argumentReference, scope);

                expect(scope.getVariable).to.have.been.calledOnce;
                expect(scope.getVariable).to.have.been.calledWith('myParam');
            });

            it('should set the reference of the local variable to the reference slot', function () {
                parameter.loadArgument(argumentReference, scope);

                expect(localVariable.setReference).to.have.been.calledOnce;
                expect(localVariable.setReference).to.have.been.calledWith(
                    sinon.match.same(argumentReferenceSlot)
                );
            });

            it('should not set the value of the local variable', function () {
                parameter.loadArgument(argumentReference, scope);

                expect(localVariable.setValue).not.to.have.been.called;
            });
        });
    });

    describe('populateDefaultArgument()', function () {
        it('should return the given argument reference when valid', async function () {
            var argumentReference = variableFactory.createVariable('my_var'),
                argumentValue = valueFactory.createString('my arg');
            argumentReference.setValue(argumentValue);
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(true);

            expect(await parameter.populateDefaultArgument(argumentReference).toPromise()).to.equal(argumentReference);
        });

        it('should return the given argument reference when null and parameter is typed but default is null', async function () {
            var argumentReference = variableFactory.createVariable('my_var'),
                argumentValue = valueFactory.createNull(),
                defaultValue = valueFactory.createNull();
            argumentReference.setValue(argumentValue);
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
                valueFactory,
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
            var argumentValue = valueFactory.createString('my arg');

            return expect(parameter.validateArgument(argumentValue).toPromise())
                .to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error [null] for #core.only_variables_by_reference with {} reportsOwnContext=no skipCurrentStackFrame=no ' +
                    '@ null:null'
                );
        });

        it('should raise an error when argument is non-null and not valid and context is given for builtin', function () {
            var argumentReference = sinon.createStubInstance(Variable),
                argumentValue = valueFactory.createString('my invalid argument'),
                defaultValue = valueFactory.createNull();
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(futureFactory.createPresent(false)); // Type disallows null (e.g. a class type not prefixed with ? in PHP7+).
            defaultValueProvider.returns(defaultValue); // Default is null, meaning null can be passed.
            callStack.getCurrent.returns(sinon.createStubInstance(Call));
            callStack.getCallerFilePath.returns('/my/caller/module.php');
            callStack.getCallerLastLine.returns(12345);

            return expect(parameter.validateArgument(argumentReference, argumentValue).toPromise())
                .to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error [TypeError] for #core.invalid_value_for_type_builtin with {' +
                    '"index":7,' +
                    '"name":"myParam",' +
                    '"actualType":"string",' +
                    '"callerFile":"/my/caller/module.php",' +
                    '"callerLine":12345' +
                    '} reportsOwnContext=yes ' +
                    'context(#core.call_to_builtin with {"callerFile":"/my/caller/module.php","callerLine":12345})' +
                    ' skipCurrentStackFrame=yes ' +
                    '@ /my/caller/module.php:12345'
                );
        });

        it('should raise an error when argument is non-null and not valid and context is given for userland', function () {
            var argumentReference = sinon.createStubInstance(Variable),
                argumentValue = valueFactory.createString('my invalid argument'),
                defaultValue = valueFactory.createNull();
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(futureFactory.createPresent(false)); // Type disallows null (e.g. a class type not prefixed with ? in PHP7+).
            defaultValueProvider.returns(defaultValue); // Default is null, meaning null can be passed.
            callStack.getCurrent.returns(sinon.createStubInstance(Call));
            callStack.getCallerFilePath.returns('/my/caller/module.php');
            callStack.getCallerLastLine.returns(12345);
            callStack.isUserland.returns(true);

            return expect(parameter.validateArgument(argumentReference, argumentValue).toPromise())
                .to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error [TypeError] for #core.invalid_value_for_type_userland with {' +
                    '"index":7,' +
                    '"name":"myParam",' +
                    '"actualType":"string",' +
                    '"callerFile":"/my/caller/module.php",' +
                    '"callerLine":12345' +
                    '} reportsOwnContext=yes ' +
                    'context(#core.defined_in_userland with {"definitionFile":"/path/to/my/module.php","definitionLine":101}) ' +
                    'skipCurrentStackFrame=no ' +
                    '@ /path/to/my/module.php:101' // Note definition rather than caller is given here.
                );
        });

        it('should raise an error when argument is non-null and not valid but context is not given for builtin', function () {
            var argumentReference = sinon.createStubInstance(Variable),
                argumentValue = valueFactory.createString('my invalid argument'),
                defaultValue = valueFactory.createNull();
            parameter = new Parameter(
                callStack,
                valueFactory,
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
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(futureFactory.createPresent(false)); // Type disallows null (e.g. a class type not prefixed with ? in PHP7+).
            defaultValueProvider.returns(defaultValue); // Default is null, meaning null can be passed.
            callStack.getCurrent.returns(sinon.createStubInstance(Call));
            callStack.getCallerFilePath.returns(null);
            callStack.getCallerLastLine.returns(null);

            return expect(parameter.validateArgument(argumentReference, argumentValue).toPromise())
                .to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error [TypeError] for #core.invalid_value_for_type_builtin with {' +
                    '"index":7,' +
                    '"name":"myParam",' +
                    '"actualType":"string",' +
                    '"callerFile":"[Translated] core.unknown {}",' +
                    '"callerLine":"[Translated] core.unknown {}"' +
                    '} reportsOwnContext=yes ' +
                    'context(#core.call_to_builtin with {"callerFile":"[Translated] core.unknown {}","callerLine":"[Translated] core.unknown {}"}) ' +
                    'skipCurrentStackFrame=yes ' +
                    '@ [Translated] core.unknown {}:[Translated] core.unknown {}'
                );
        });

        it('should raise an error when argument is null but type does not allow null and there is no default for builtin', function () {
            var argumentReference = sinon.createStubInstance(Variable),
                argumentValue = valueFactory.createNull();
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(futureFactory.createPresent(false)); // Type disallows null (e.g. a class type not prefixed with ? in PHP7+).
            callStack.getCurrent.returns(sinon.createStubInstance(Call));
            callStack.getCallerFilePath.returns('/my/caller/module.php');
            callStack.getCallerLastLine.returns(12345);
            parameter = new Parameter(
                callStack,
                valueFactory,
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
                null, // No default given, so null has not been allowed.
                '/path/to/my/module.php',
                101
            );

            return expect(parameter.validateArgument(argumentReference, argumentValue).toPromise())
                .to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error [TypeError] for #core.invalid_value_for_type_builtin with {' +
                    '"index":7,' +
                    '"name":"myParam",' +
                    '"actualType":"null",' +
                    '"callerFile":"/my/caller/module.php",' +
                    '"callerLine":12345' +
                    '} reportsOwnContext=yes ' +
                    'context(#core.call_to_builtin with {"callerFile":"/my/caller/module.php","callerLine":12345})' +
                    ' skipCurrentStackFrame=yes ' +
                    '@ /my/caller/module.php:12345'
                );
        });

        // An example would be a parameter of array type with a default value of an array literal.
        it('should raise an error when argument is null but type does not allow null and default is not null for builtin', function () {
            var argumentReference = sinon.createStubInstance(Variable),
                argumentValue = valueFactory.createNull();
            defaultValueProvider.returns(valueFactory.createArray(['some value']));
            typeObject.allowsValue
                .withArgs(sinon.match.same(argumentValue))
                .returns(futureFactory.createPresent(false)); // Type disallows null (e.g. a class type not prefixed with ? in PHP7+).
            callStack.getCurrent.returns(sinon.createStubInstance(Call));
            callStack.getCallerFilePath.returns('/my/caller/module.php');
            callStack.getCallerLastLine.returns(12345);

            return expect(parameter.validateArgument(argumentReference, argumentValue).toPromise())
                .to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error [TypeError] for #core.invalid_value_for_type_builtin with {' +
                    '"index":7,' +
                    '"name":"myParam",' +
                    '"actualType":"null",' +
                    '"callerFile":"/my/caller/module.php",' +
                    '"callerLine":12345' +
                    '} reportsOwnContext=yes ' +
                    'context(#core.call_to_builtin with {"callerFile":"/my/caller/module.php","callerLine":12345}) ' +
                    'skipCurrentStackFrame=yes ' +
                    '@ /my/caller/module.php:12345'
                );
        });

        it('should throw when parameter is required but no argument is given', function () {
            parameter = new Parameter(
                callStack,
                valueFactory,
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
                    Exception,
                    'Missing argument for required parameter "myParam"'
                );
        });
    });
});
