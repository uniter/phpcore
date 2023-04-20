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
    CallFactory = require('../../src/CallFactory'),
    Class = require('../../src/Class').sync(),
    ControlFactory = require('../../src/Control/ControlFactory'),
    InstrumentationFactory = require('../../src/Instrumentation/InstrumentationFactory'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    Scope = require('../../src/Scope').sync(),
    Trace = require('../../src/Control/Trace'),
    Value = require('../../src/Value').sync();

describe('CallFactory', function () {
    var Call,
        controlFactory,
        factory,
        FFICall,
        instrumentationFactory,
        namespaceScope,
        scope,
        trace;

    beforeEach(function () {
        Call = sinon.stub();
        controlFactory = sinon.createStubInstance(ControlFactory);
        FFICall = sinon.stub();
        instrumentationFactory = sinon.createStubInstance(InstrumentationFactory);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        scope = sinon.createStubInstance(Scope);
        trace = null; // Assigned by stub below.

        controlFactory.createTrace.callsFake(function () {
            trace = sinon.createStubInstance(Trace);

            return trace;
        });

        factory = new CallFactory(Call, FFICall, instrumentationFactory);
        factory.setControlFactory(controlFactory);
    });

    describe('create()', function () {
        it('should return an instance of Call', function () {
            expect(factory.create(scope, namespaceScope)).to.be.an.instanceOf(Call);
        });

        it('should pass the Scope to the Call constructor', function () {
            factory.create(scope, namespaceScope);

            expect(Call).to.have.been.calledOnce;
            expect(Call).to.have.been.calledWith(sinon.match.same(scope));
        });

        it('should pass the NamespaceScope to the Call constructor', function () {
            factory.create(scope, namespaceScope);

            expect(Call).to.have.been.calledOnce;
            expect(Call).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(namespaceScope)
            );
        });

        it('should pass the Trace to the Call constructor', function () {
            factory.create(scope, namespaceScope);

            expect(Call).to.have.been.calledOnce;
            expect(Call).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(trace)
            );
        });

        it('should pass the InstrumentationFactory to the Call constructor', function () {
            factory.create(scope, namespaceScope);

            expect(Call).to.have.been.calledOnce;
            expect(Call).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(instrumentationFactory)
            );
        });

        it('should pass the argument values to the Call constructor if specified', function () {
            var argValue1 = sinon.createStubInstance(Value),
                argValue2 = sinon.createStubInstance(Value);

            factory.create(scope, namespaceScope, [argValue1, argValue2]);

            expect(Call).to.have.been.calledOnce;
            expect(Call).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match([sinon.match.same(argValue1), sinon.match.same(argValue2)])
            );
        });

        it('should pass an empty array of argument values to the Call constructor if none specified', function () {
            factory.create(scope, namespaceScope);

            expect(Call).to.have.been.calledOnce;
            expect(Call).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match([])
            );
        });

        it('should pass the new static class to the Call constructor if specified', function () {
            var newStaticClass = sinon.createStubInstance(Class);

            factory.create(scope, namespaceScope, [], newStaticClass);

            expect(Call).to.have.been.calledOnce;
            expect(Call).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(newStaticClass)
            );
        });

        it('should pass null as the new static class to the Call constructor if none specified', function () {
            factory.create(scope, namespaceScope);

            expect(Call).to.have.been.calledOnce;
            expect(Call).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });
    });

    describe('createFFICall()', function () {
        it('should return an instance of FFICall', function () {
            expect(factory.createFFICall()).to.be.an.instanceOf(FFICall);
        });

        it('should pass the argument values to the Call constructor if specified', function () {
            var argValue1 = sinon.createStubInstance(Value),
                argValue2 = sinon.createStubInstance(Value);

            factory.createFFICall([argValue1, argValue2]);

            expect(FFICall).to.have.been.calledOnce;
            expect(FFICall).to.have.been.calledWith(
                sinon.match([sinon.match.same(argValue1), sinon.match.same(argValue2)])
            );
        });

        it('should pass an empty array of argument values to the Call constructor if none specified', function () {
            factory.createFFICall();

            expect(FFICall).to.have.been.calledOnce;
            expect(FFICall).to.have.been.calledWith(sinon.match([]));
        });
    });
});
