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
    beforeEach(function () {
        var mode = 'async';
        this.environment = sinon.createStubInstance(Environment);
        this.options = {};
        this.pausable = {
            createPause: function () {
                return sinon.createStubInstance(PauseException);
            }
        };
        this.phpCommon = {};
        this.phpToAST = {};
        this.phpToJS = {};
        this.state = sinon.createStubInstance(PHPState);
        this.topLevelScope = sinon.createStubInstance(Scope);
        this.valueFactory = new ValueFactory();
        this.wrapper = sinon.stub();

        this.environment.getState.returns(this.state);
        this.state.getValueFactory.returns(this.valueFactory);

        this.createEngine = function (customMode) {
            this.engine = new Engine(
                this.environment,
                this.topLevelScope,
                this.phpCommon,
                this.options,
                this.wrapper,
                this.pausable,
                customMode || mode
            );
        }.bind(this);

        this.whenPausableIsAvailable = function () {
            mode = 'async';
            this.createEngine();
        }.bind(this);
        this.whenPausableIsNotAvailable = function () {
            mode = 'sync';
            this.pausable = null;
            this.createEngine();
        }.bind(this);
    });

    describe('aliasFunction()', function () {
        it('should alias the function via the Environment', function () {
            this.createEngine();

            this.engine.aliasFunction('originalFunc', 'aliasFunc');

            expect(this.environment.aliasFunction).to.have.been.calledOnce;
            expect(this.environment.aliasFunction).to.have.been.calledWith('originalFunc', 'aliasFunc');
        });
    });

    describe('createFFIResult()', function () {
        it('should create an FFI Result via the Environment', function () {
            var ffiResult = sinon.createStubInstance(FFIResult),
                asyncCallback = sinon.stub(),
                syncCallback = sinon.stub();
            this.environment.createFFIResult
                .withArgs(sinon.match.same(syncCallback), sinon.match.same(asyncCallback))
                .returns(ffiResult);
            this.createEngine();

            expect(this.engine.createFFIResult(syncCallback, asyncCallback)).to.equal(ffiResult);
        });
    });

    describe('createPause()', function () {
        it('should return a PauseException when the Pausable library is available', function () {
            this.whenPausableIsAvailable();

            expect(this.engine.createPause()).to.be.an.instanceOf(PauseException);
        });

        it('should throw an exception when the Pausable library is not available', function () {
            this.whenPausableIsNotAvailable();

            expect(function () {
                this.engine.createPause();
            }.bind(this)).to.throw('Pausable is not available');
        });
    });

    describe('defineClass()', function () {
        it('should define a class on the environment', function () {
            var myClassDefinitionFactory = sinon.stub();
            this.createEngine();

            this.engine.defineClass('My\\Fqcn', myClassDefinitionFactory);

            expect(this.environment.defineClass).to.have.been.calledOnce;
            expect(this.environment.defineClass).to.have.been.calledWith(
                'My\\Fqcn',
                sinon.match.same(myClassDefinitionFactory)
            );
        });

        it('should return the defined class from the environment', function () {
            var myClassDefinitionFactory = sinon.stub(),
                myClassObject = sinon.createStubInstance(Class);
            this.environment.defineClass
                .withArgs('My\\Fqcn', sinon.match.same(myClassDefinitionFactory))
                .returns(myClassObject);
            this.createEngine();

            expect(this.engine.defineClass('My\\Fqcn', myClassDefinitionFactory))
                .to.equal(myClassObject);
        });
    });

    describe('defineCoercingFunction()', function () {
        it('should define a coercing function on the environment', function () {
            var myFunction = sinon.stub();
            this.createEngine();

            this.engine.defineCoercingFunction('my_func', myFunction);

            expect(this.environment.defineCoercingFunction).to.have.been.calledOnce;
            expect(this.environment.defineCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction)
            );
        });
    });

    describe('defineConstant()', function () {
        it('should define a constant on the environment', function () {
            this.createEngine();

            this.engine.defineConstant('MY_CONST', 21, {caseInsensitive: true});

            expect(this.environment.defineConstant).to.have.been.calledOnce;
            expect(this.environment.defineConstant).to.have.been.calledWith(
                'MY_CONST',
                21,
                {caseInsensitive: true}
            );
        });
    });

    describe('defineGlobal()', function () {
        it('should define a global on the environment', function () {
            this.createEngine();

            this.engine.defineGlobal('my_global', 21);

            expect(this.environment.defineGlobal).to.have.been.calledOnce;
            expect(this.environment.defineGlobal).to.have.been.calledWith('my_global');
            expect(this.environment.defineGlobal.args[0][1].getType()).to.equal('int');
            expect(this.environment.defineGlobal.args[0][1].getNative()).to.equal(21);
        });
    });

    describe('defineGlobalAccessor()', function () {
        it('should define a global accessor on the environment', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.stub();
            this.createEngine();

            this.engine.defineGlobalAccessor('my_global', valueGetter, valueSetter);

            expect(this.environment.defineGlobalAccessor).to.have.been.calledOnce;
            expect(this.environment.defineGlobalAccessor).to.have.been.calledWith(
                'my_global',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter)
            );
        });
    });

    describe('defineNonCoercingFunction()', function () {
        it('should define a non-coercing function on the environment', function () {
            var myFunction = sinon.stub();
            this.createEngine();

            this.engine.defineNonCoercingFunction('my_func', myFunction);

            expect(this.environment.defineNonCoercingFunction).to.have.been.calledOnce;
            expect(this.environment.defineNonCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction)
            );
        });
    });

    describe('defineSuperGlobalAccessor()', function () {
        it('should define the superglobal on the environment', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            this.createEngine();

            this.engine.defineSuperGlobalAccessor('MY_SUPER', valueGetter, valueSetter);

            expect(this.environment.defineSuperGlobalAccessor).to.have.been.calledOnce;
            expect(this.environment.defineSuperGlobalAccessor).to.have.been.calledWith(
                'MY_SUPER',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter)
            );
        });
    });

    describe('getConstant()', function () {
        it('should return the value of the constant from the environment', function () {
            this.createEngine();
            this.environment.getConstant.withArgs('A_CONST').returns('my value');

            expect(this.engine.getConstant('A_CONST')).to.equal('my value');
        });
    });
});
