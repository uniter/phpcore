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
    Class = require('../../src/Class').sync(),
    Engine = require('../../src/Engine'),
    Environment = require('../../src/Environment'),
    FFIResult = require('../../src/FFI/Result'),
    PauseException = require('pausable/src/PauseException'),
    Scope = require('../../src/Scope').sync(),
    PHPState = require('../../src/PHPState').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Engine', function () {
    var createEngine,
        engine,
        environment,
        mode,
        options,
        pausable,
        phpCommon,
        phpToAST,
        phpToJS,
        state,
        topLevelScope,
        valueFactory,
        whenPausableIsAvailable,
        whenPausableIsNotAvailable,
        wrapper;

    beforeEach(function () {
        mode = 'async';
        environment = sinon.createStubInstance(Environment);
        options = {};
        pausable = {
            createPause: function () {
                return sinon.createStubInstance(PauseException);
            }
        };
        phpCommon = {};
        phpToAST = {};
        phpToJS = {};
        state = sinon.createStubInstance(PHPState);
        topLevelScope = sinon.createStubInstance(Scope);
        valueFactory = new ValueFactory();
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
                pausable,
                customMode || mode
            );
        };

        whenPausableIsAvailable = function () {
            mode = 'async';
            createEngine();
        };
        whenPausableIsNotAvailable = function () {
            mode = 'sync';
            pausable = null;
            createEngine();
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

    describe('createPause()', function () {
        it('should return a PauseException when the Pausable library is available', function () {
            whenPausableIsAvailable();

            expect(engine.createPause()).to.be.an.instanceOf(PauseException);
        });

        it('should throw an exception when the Pausable library is not available', function () {
            whenPausableIsNotAvailable();

            expect(function () {
                engine.createPause();
            }).to.throw('Pausable is not available');
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

        it('should return the defined class from the environment', function () {
            var myClassDefinitionFactory = sinon.stub(),
                myClassObject = sinon.createStubInstance(Class);
            environment.defineClass
                .withArgs('My\\Fqcn', sinon.match.same(myClassDefinitionFactory))
                .returns(myClassObject);
            createEngine();

            expect(engine.defineClass('My\\Fqcn', myClassDefinitionFactory))
                .to.equal(myClassObject);
        });
    });

    describe('defineCoercingFunction()', function () {
        it('should define a coercing function on the environment', function () {
            var myFunction = sinon.stub();
            createEngine();

            engine.defineCoercingFunction('my_func', myFunction);

            expect(environment.defineCoercingFunction).to.have.been.calledOnce;
            expect(environment.defineCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction)
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
            var valueGetter = sinon.stub(),
                valueSetter = sinon.stub();
            createEngine();

            engine.defineGlobalAccessor('my_global', valueGetter, valueSetter);

            expect(environment.defineGlobalAccessor).to.have.been.calledOnce;
            expect(environment.defineGlobalAccessor).to.have.been.calledWith(
                'my_global',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter)
            );
        });
    });

    describe('defineNonCoercingFunction()', function () {
        it('should define a non-coercing function on the environment', function () {
            var myFunction = sinon.stub();
            createEngine();

            engine.defineNonCoercingFunction('my_func', myFunction);

            expect(environment.defineNonCoercingFunction).to.have.been.calledOnce;
            expect(environment.defineNonCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction)
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
});
