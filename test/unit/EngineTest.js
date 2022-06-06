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
    Engine = require('../../src/Engine'),
    Environment = require('../../src/Environment'),
    FFIResult = require('../../src/FFI/Result'),
    Scope = require('../../src/Scope').sync(),
    PHPState = require('../../src/PHPState').sync();

describe('Engine', function () {
    var createEngine,
        engine,
        environment,
        mode,
        options,
        phpCommon,
        phpToAST,
        phpToJS,
        state,
        topLevelScope,
        valueFactory,
        wrapper;

    beforeEach(function () {
        mode = 'async';
        environment = sinon.createStubInstance(Environment);
        options = {};
        phpCommon = {};
        phpToAST = {};
        phpToJS = {};
        state = sinon.createStubInstance(PHPState);
        topLevelScope = sinon.createStubInstance(Scope);
        valueFactory = tools.createIsolatedState().getValueFactory();
        wrapper = sinon.stub();

        environment.getState.returns(state);
        state.getValueFactory.returns(valueFactory);

        createEngine = function (customMode) {
            engine = new Engine(
                environment,
                topLevelScope,
                phpCommon,
                options,
                wrapper,
                customMode || mode
            );
        };
    });

    describe('aliasFunction()', function () {
        it('should alias the function via the Environment', function () {
            createEngine();

            engine.aliasFunction('originalFunc', 'aliasFunc');

            expect(environment.aliasFunction).to.have.been.calledOnce;
            expect(environment.aliasFunction).to.have.been.calledWith('originalFunc', 'aliasFunc');
        });
    });

    describe('createFFIResult()', function () {
        it('should create an FFI Result via the Environment', function () {
            var ffiResult = sinon.createStubInstance(FFIResult),
                asyncCallback = sinon.stub(),
                syncCallback = sinon.stub();
            environment.createFFIResult
                .withArgs(sinon.match.same(syncCallback), sinon.match.same(asyncCallback))
                .returns(ffiResult);
            createEngine();

            expect(engine.createFFIResult(syncCallback, asyncCallback)).to.equal(ffiResult);
        });
    });

    describe('defineClass()', function () {
        it('should define a class on the environment', function () {
            var myClassDefinitionFactory = sinon.stub();
            createEngine();

            engine.defineClass('My\\Fqcn', myClassDefinitionFactory);

            expect(environment.defineClass).to.have.been.calledOnce;
            expect(environment.defineClass).to.have.been.calledWith(
                'My\\Fqcn',
                sinon.match.same(myClassDefinitionFactory)
            );
        });
    });

    describe('defineCoercingFunction()', function () {
        it('should define a coercing function on the environment', function () {
            var myFunction = sinon.stub();
            createEngine();

            engine.defineCoercingFunction('my_func', myFunction, 'mixed $myParam = 21');

            expect(environment.defineCoercingFunction).to.have.been.calledOnce;
            expect(environment.defineCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction),
                'mixed $myParam = 21'
            );
        });
    });

    describe('defineConstant()', function () {
        it('should define a constant on the environment', function () {
            createEngine();

            engine.defineConstant('MY_CONST', 21, {caseInsensitive: true});

            expect(environment.defineConstant).to.have.been.calledOnce;
            expect(environment.defineConstant).to.have.been.calledWith(
                'MY_CONST',
                21,
                {caseInsensitive: true}
            );
        });
    });

    describe('defineFunction()', function () {
        it('should define a function on the environment', function () {
            var myFunctionDefinitionFactory = sinon.stub();
            createEngine();

            engine.defineFunction('My\\Fqcn', myFunctionDefinitionFactory);

            expect(environment.defineFunction).to.have.been.calledOnce;
            expect(environment.defineFunction).to.have.been.calledWith(
                'My\\Fqcn',
                sinon.match.same(myFunctionDefinitionFactory)
            );
        });

        it('should return the defined function from the environment', function () {
            var myFunctionDefinitionFactory = sinon.stub(),
                myFunctionObject = sinon.stub();
            environment.defineFunction
                .withArgs('My\\Fqcn', sinon.match.same(myFunctionDefinitionFactory))
                .returns(myFunctionObject);
            createEngine();

            expect(engine.defineFunction('My\\Fqcn', myFunctionDefinitionFactory))
                .to.equal(myFunctionObject);
        });
    });

    describe('defineGlobal()', function () {
        it('should define a global on the environment', function () {
            createEngine();

            engine.defineGlobal('my_global', 21);

            expect(environment.defineGlobal).to.have.been.calledOnce;
            expect(environment.defineGlobal).to.have.been.calledWith('my_global');
            expect(environment.defineGlobal.args[0][1].getType()).to.equal('int');
            expect(environment.defineGlobal.args[0][1].getNative()).to.equal(21);
        });
    });

    describe('defineGlobalAccessor()', function () {
        it('should define a global accessor on the environment', function () {
            var referenceSetter = sinon.stub(),
                valueGetter = sinon.stub(),
                valueSetter = sinon.stub();
            createEngine();

            engine.defineGlobalAccessor('my_global', valueGetter, valueSetter, referenceSetter);

            expect(environment.defineGlobalAccessor).to.have.been.calledOnce;
            expect(environment.defineGlobalAccessor).to.have.been.calledWith(
                'my_global',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter),
                sinon.match.same(referenceSetter)
            );
        });
    });

    describe('defineNonCoercingFunction()', function () {
        it('should define a non-coercing function on the environment', function () {
            var myFunction = sinon.stub();
            createEngine();

            engine.defineNonCoercingFunction('my_func', myFunction, 'mixed $myParam = 21');

            expect(environment.defineNonCoercingFunction).to.have.been.calledOnce;
            expect(environment.defineNonCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction),
                'mixed $myParam = 21'
            );
        });
    });

    describe('defineSuperGlobal()', function () {
        it('should define the super global on the environment', function () {
            var value = valueFactory.createInteger(21);
            createEngine();

            engine.defineSuperGlobal('myGlobal', value);

            expect(environment.defineSuperGlobal).to.have.been.calledOnce;
            expect(environment.defineSuperGlobal).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(value)
            );
        });
    });

    describe('defineSuperGlobalAccessor()', function () {
        it('should define the superglobal on the environment', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            createEngine();

            engine.defineSuperGlobalAccessor('MY_SUPER', valueGetter, valueSetter);

            expect(environment.defineSuperGlobalAccessor).to.have.been.calledOnce;
            expect(environment.defineSuperGlobalAccessor).to.have.been.calledWith(
                'MY_SUPER',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter)
            );
        });
    });

    describe('execute()', function () {
        it('should have the inbound stack marker as its name for stack cleaning', function () {
            createEngine();

            expect(engine.execute.name).to.equal('__uniterInboundStackMarker__');
        });
    });

    describe('getConstant()', function () {
        it('should return the value of the constant from the environment', function () {
            createEngine();
            environment.getConstant.withArgs('A_CONST').returns('my value');

            expect(engine.getConstant('A_CONST')).to.equal('my value');
        });
    });

    describe('getGlobal()', function () {
        it('should return the value of the global from the environment', function () {
            createEngine();
            environment.getGlobal.withArgs('myGlobal').returns(valueFactory.createInteger(1234));

            expect(engine.getGlobal('myGlobal').getNative()).to.equal(1234);
        });
    });

    describe('setGlobal()', function () {
        it('should set the value of the global via the environment', function () {
            var value;
            createEngine();
            value = valueFactory.createInteger(1234);

            engine.setGlobal('myGlobal', value);

            expect(environment.setGlobal).to.have.been.calledOnce;
            expect(environment.setGlobal).to.have.been.calledWith('myGlobal', sinon.match.same(value));
        });
    });

    describe('toNativeWithSyncApi()', function () {
        it('should return a new sync-API ProxyClass instance via the Environment', function () {
            var originalProxy = sinon.stub(),
                syncApiProxy = sinon.stub();
            environment.toNativeWithSyncApi
                .withArgs(sinon.match.same(originalProxy))
                .returns(syncApiProxy);
            createEngine();

            expect(engine.toNativeWithSyncApi(originalProxy)).to.equal(syncApiProxy);
        });
    });
});
