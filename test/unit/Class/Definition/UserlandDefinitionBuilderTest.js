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
    Class = require('../../../../src/Class').sync(),
    ClassDefinition = require('../../../../src/Class/Definition/ClassDefinition'),
    FFIFactory = require('../../../../src/FFI/FFIFactory'),
    Namespace = require('../../../../src/Namespace').sync(),
    NamespaceScope = require('../../../../src/NamespaceScope').sync(),
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError,
    UserlandDefinitionBuilder = require('../../../../src/Class/Definition/UserlandDefinitionBuilder'),
    ValueCoercer = require('../../../../src/FFI/Value/ValueCoercer');

describe('UserlandDefinitionBuilder', function () {
    var builder,
        callStack,
        ffiFactory,
        flow,
        state,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        ffiFactory = sinon.createStubInstance(FFIFactory);
        flow = state.getFlow();
        valueFactory = state.getValueFactory();

        callStack.raiseUncatchableFatalError.callsFake(function (translationKey, placeholderVariables) {
            throw new PHPFatalError(
                'Fake uncatchable fatal error for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {}),
                '/path/to/my_module.php',
                1234
            );
        });

        ffiFactory.createValueCoercer.callsFake(function (autoCoercionEnabled) {
            return new ValueCoercer(flow, autoCoercionEnabled);
        });

        builder = new UserlandDefinitionBuilder(
            callStack,
            valueFactory,
            ffiFactory
        );
    });

    describe('buildDefinition()', function () {
        var callBuildDefinition,
            definition,
            definitionStructure,
            firstInterface,
            interfaces,
            myConstantFactoryFunction,
            myInstanceProperty,
            myStaticProperty,
            namespace,
            namespaceScope,
            secondInterface,
            superClass;

        beforeEach(function () {
            myConstantFactoryFunction = function () {};
            myInstanceProperty = {my: 'instance prop'};
            myStaticProperty = {my: 'static prop'};
            definitionStructure = {
                constants: {
                    MY_CONST: myConstantFactoryFunction
                },
                methods: {
                    __construct: function () {}
                },
                properties: {
                    myInstanceProperty: myInstanceProperty
                },
                staticProperties: {
                    myStaticProperty: myStaticProperty
                }
            };
            firstInterface = sinon.createStubInstance(Class);
            secondInterface = sinon.createStubInstance(Class);
            interfaces = [firstInterface, secondInterface];
            namespace = sinon.createStubInstance(Namespace);
            namespaceScope = sinon.createStubInstance(NamespaceScope);
            superClass = sinon.createStubInstance(Class);

            namespace.getPrefix.returns('My\\Stuff\\');

            superClass.getInternalClass.returns(function () {});

            callBuildDefinition = function (name, autoCoercionEnabled) {
                definition = builder.buildDefinition(
                    name || 'MyClass',
                    definitionStructure,
                    superClass,
                    namespace,
                    namespaceScope,
                    interfaces,
                    Boolean(autoCoercionEnabled)
                );
            };
        });

        it('should throw when the definition is a function (ensure a native definition was not given in error)', function () {
            definitionStructure = function () {}; // Not a valid userland definition

            expect(function () {
                callBuildDefinition('MyInvalidThrowable');
            }).to.throw(
                'UserlandDefinitionBuilder :: Expected a plain object'
            );
        });

        it('should return a ClassDefinition', function () {
            callBuildDefinition();

            expect(definition).to.be.an.instanceOf(ClassDefinition);
        });

        describe('the ClassDefinition returned', function () {
            it('should have the fully-qualified name of the class (including namespace)', function () {
                callBuildDefinition();

                expect(definition.getName()).to.equal('My\\Stuff\\MyClass');
            });

            it('should have the correct Namespace reference', function () {
                callBuildDefinition();

                expect(definition.getNamespace()).to.equal(namespace);
            });

            it('should have the correct NamespaceScope reference', function () {
                callBuildDefinition();

                expect(definition.getNamespaceScope()).to.equal(namespaceScope);
            });

            it('should have the correct superclass reference', function () {
                callBuildDefinition();

                expect(definition.getSuperClass()).to.equal(superClass);
            });

            it('should have the correct interfaces', function () {
                callBuildDefinition();

                expect(definition.getInterfaces()).to.have.length(2);
                expect(definition.getInterfaces()[0]).to.equal(firstInterface);
                expect(definition.getInterfaces()[1]).to.equal(secondInterface);
            });

            it('should have the constants of the class definition', function () {
                callBuildDefinition();

                expect(definition.getConstants().MY_CONST).to.equal(myConstantFactoryFunction);
            });

            it('should have null for class constructor name when none defined', function () {
                delete definitionStructure.methods.__construct;

                callBuildDefinition();

                expect(definition.getConstructorName()).to.be.null;
            });

            it('should have the correct class constructor name when __construct()', function () {
                callBuildDefinition();

                expect(definition.getConstructorName()).to.equal('__construct');
            });

            it('should have the correct class constructor name when PHP4-style', function () {
                delete definitionStructure.methods.__construct;
                definitionStructure.methods.MyClass = function () {};

                callBuildDefinition();

                expect(definition.getConstructorName()).to.equal('MyClass');
            });

            it('should raise a strict standards notice when PHP4-style constructor is overridden by PHP5-style one', function () {
                delete definitionStructure.methods.__construct; // So we can re-add in the correct order
                definitionStructure.methods.MyClass = function () {};
                definitionStructure.methods.__construct = function () {};

                callBuildDefinition();

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_STRICT,
                    'Redefining already defined constructor for class MyClass'
                );
            });

            it('should have the InternalClass\' prototype as the root internal prototype', function () {
                callBuildDefinition();

                expect(definition.getRootInternalPrototype()).to.equal(definition.getInternalClass().prototype);
            });

            it('should have the instance properties of the class definition', function () {
                callBuildDefinition();

                expect(definition.getInstanceProperties()).to.deep.equal({
                    myInstanceProperty: myInstanceProperty
                });
            });

            it('should have the static properties of the class definition', function () {
                callBuildDefinition();

                expect(definition.getStaticProperties()).to.deep.equal({
                    myStaticProperty: myStaticProperty
                });
            });

            it('should have an auto-coercing ValueCoercer when auto-coercion is enabled', function () {
                callBuildDefinition('MyClass', true);

                expect(definition.getValueCoercer().isAutoCoercionEnabled()).to.be.true;
            });

            it('should have a non-coercing ValueCoercer when auto-coercion is disabled', function () {
                callBuildDefinition('MyClass', false);

                expect(definition.getValueCoercer().isAutoCoercionEnabled()).to.be.false;
            });
        });

        it('should raise an uncatchable fatal error when a PHP-defined class attempts to implement Throwable', function () {
            firstInterface.is
                .withArgs('Throwable')
                .returns(true);

            expect(function () {
                callBuildDefinition('MyInvalidThrowable');
            }).to.throw(
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_implement_throwable ' +
                'with {"className":"My\\\\Stuff\\\\MyInvalidThrowable"} in /path/to/my_module.php on line 1234'
            );
        });
    });
});
