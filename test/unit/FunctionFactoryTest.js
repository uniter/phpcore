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
    sinon = require('sinon'),
    tools = require('./tools'),
    Call = require('../../src/Call'),
    Callable = require('../../src/Function/Callable'),
    CallFactory = require('../../src/CallFactory'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    ControlScope = require('../../src/Control/ControlScope'),
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    FunctionSpec = require('../../src/Function/FunctionSpec'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    Scope = require('../../src/Scope').sync(),
    ScopeFactory = require('../../src/ScopeFactory');

describe('FunctionFactory', function () {
    var call,
        callFactory,
        callStack,
        controlBridge,
        controlScope,
        currentClass,
        factory,
        flow,
        futureFactory,
        MethodSpec,
        name,
        namespaceScope,
        originalFunc,
        pauseFactory,
        scope,
        scopeFactory,
        state,
        valueFactory;

    beforeEach(function () {
        controlScope = sinon.createStubInstance(ControlScope);
        callFactory = sinon.createStubInstance(CallFactory);
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_factory': callFactory,
            'call_stack': callStack,
            'control_scope': controlScope
        });
        call = sinon.createStubInstance(Call);
        controlBridge = state.getControlBridge();
        currentClass = sinon.createStubInstance(Class);
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        originalFunc = sinon.stub();
        MethodSpec = sinon.stub();
        name = 'myFunction';
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        pauseFactory = state.getPauseFactory();
        scope = sinon.createStubInstance(Scope);
        scopeFactory = sinon.createStubInstance(ScopeFactory);
        valueFactory = state.getValueFactory();

        callFactory.create.returns(call);
        scopeFactory.create.returns(scope);

        factory = new FunctionFactory(
            Callable,
            MethodSpec,
            scopeFactory,
            callFactory,
            valueFactory,
            callStack,
            flow,
            controlBridge,
            controlScope
        );
    });

    describe('createCallable()', function () {
        it('should return a Callable instance', function () {
            var functionSpec = sinon.createStubInstance(FunctionSpec),
                result = factory.createCallable(
                    namespaceScope,
                    currentClass,
                    null,
                    null,
                    functionSpec
                );

            expect(result).to.be.an.instanceOf(Callable);
        });

        it('should pass the correct arguments to the Callable constructor', function () {
            var functionSpec = sinon.createStubInstance(FunctionSpec),
                currentObject = valueFactory.createObject({}, currentClass),
                staticClass = sinon.createStubInstance(Class),
                // Wrap the real Callable as a spy so we can assert on constructor calls.
                CallableSpy = sinon.spy(factory.Callable);
            factory.Callable = CallableSpy;

            factory.createCallable(
                namespaceScope,
                currentClass,
                currentObject,
                staticClass,
                functionSpec
            );

            expect(CallableSpy).to.have.been.calledOnce;
            expect(CallableSpy).to.have.been.calledWith(
                sinon.match.same(scopeFactory),
                sinon.match.same(callFactory),
                sinon.match.same(valueFactory),
                sinon.match.same(callStack),
                sinon.match.same(flow),
                sinon.match.same(namespaceScope),
                sinon.match.same(currentClass),
                sinon.match.same(currentObject),
                sinon.match.same(staticClass),
                sinon.match.same(functionSpec)
            );
        });
    });

    describe('createMethodSpec()', function () {
        it('should create the MethodSpec using the correct constructor args', function () {
            var classObject = sinon.createStubInstance(Class),
                myMethod = sinon.stub(),
                originalClass = sinon.createStubInstance(Class);

            factory.createMethodSpec(originalClass, classObject, 'myMethod', myMethod);

            expect(MethodSpec).to.have.been.calledOnce;
            expect(MethodSpec).to.have.been.calledWith(
                sinon.match.same(originalClass),
                sinon.match.same(classObject),
                'myMethod',
                sinon.match.same(myMethod)
            );
        });

        it('should return the created MethodSpec', function () {
            var classObject = sinon.createStubInstance(Class),
                methodSpec = sinon.createStubInstance(MethodSpec),
                myMethod = sinon.stub(),
                originalClass = sinon.createStubInstance(Class);
            MethodSpec.returns(methodSpec);

            expect(factory.createMethodSpec(originalClass, classObject, 'myMethod', myMethod)).to.equal(methodSpec);
        });
    });
});
