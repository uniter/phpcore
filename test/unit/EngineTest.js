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
    Promise = require('lie'),
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

    describe('constructor', function () {
        it('should throw when an invalid mode is given', function () {
            expect(function () {
                this.createEngine('my-invalid-mode');
            }.bind(this)).to.throw('Invalid mode "my-invalid-mode" given - must be one of "async", "psync" or "sync"');
        });

        it('should throw when async mode is given but Pausable is not', function () {
            this.whenPausableIsNotAvailable();

            expect(function () {
                this.createEngine('async');
            }.bind(this)).to.throw('Pausable library must be provided for async mode');
        });
    });

    describe('createFFIResult()', function () {
        beforeEach(function () {
            this.asyncCallback = sinon.stub();
            this.syncCallback = sinon.stub();
            this.createEngine();

            this.syncCallback.returns(21);
            this.asyncCallback.callsFake(function () {
                return Promise.resolve(101);
            });
        });

        it('should return an instance of FFI Result', function () {
            expect(this.engine.createFFIResult(this.syncCallback, this.asyncCallback)).to.be.an.instanceOf(FFIResult);
        });

        describe('the instance of FFI Result returned', function () {
            beforeEach(function () {
                this.ffiResult = this.engine.createFFIResult(this.syncCallback, this.asyncCallback);
            });

            it('should be passed the sync callback correctly', function () {
                expect(this.ffiResult.getSync()).to.equal(21);
            });

            it('should be passed the async callback correctly', function () {
                expect(this.ffiResult.getAsync()).to.eventually.equal(101);
            });
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

    describe('defineGlobal()', function () {
        it('should define a global on the environment', function () {
            this.createEngine();

            this.engine.defineGlobal('my_global', 21);

            expect(this.environment.defineGlobal).to.have.been.calledOnce;
            expect(this.environment.defineGlobal).to.have.been.calledWith('my_global');
            expect(this.environment.defineGlobal.args[0][1].getType()).to.equal('integer');
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
