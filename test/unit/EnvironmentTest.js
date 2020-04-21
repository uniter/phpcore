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
    Environment = require('../../src/Environment'),
    ErrorReporting = require('../../src/Error/ErrorReporting'),
    FFIResult = require('../../src/FFI/Result'),
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError,
    PHPParseError = phpCommon.PHPParseError,
    PHPState = require('../../src/PHPState').sync(),
    Promise = require('lie'),
    Value = require('../../src/Value').sync();

describe('Environment', function () {
    beforeEach(function () {
        this.state = sinon.createStubInstance(PHPState);

        this.environment = new Environment(this.state);
    });

    describe('aliasFunction()', function () {
        it('should alias the function via the PHPState', function () {
            this.environment.aliasFunction('originalFunc', 'aliasFunc');

            expect(this.state.aliasFunction).to.have.been.calledOnce;
            expect(this.state.aliasFunction).to.have.been.calledWith('originalFunc', 'aliasFunc');
        });
    });

    describe('createFFIResult()', function () {
        beforeEach(function () {
            this.asyncCallback = sinon.stub();
            this.syncCallback = sinon.stub();

            this.syncCallback.returns(21);
            this.asyncCallback.callsFake(function () {
                return Promise.resolve(101);
            });
        });

        it('should return an instance of FFI Result', function () {
            expect(this.environment.createFFIResult(this.syncCallback, this.asyncCallback)).to.be.an.instanceOf(FFIResult);
        });

        describe('the instance of FFI Result returned', function () {
            beforeEach(function () {
                this.ffiResult = this.environment.createFFIResult(this.syncCallback, this.asyncCallback);
            });

            it('should be passed the sync callback correctly', function () {
                expect(this.ffiResult.getSync()).to.equal(21);
            });

            it('should be passed the async callback correctly', function () {
                expect(this.ffiResult.getAsync()).to.eventually.equal(101);
            });
        });
    });

    describe('defineClass()', function () {
        it('should define the class on the state', function () {
            var definitionFactory = sinon.stub();

            this.environment.defineClass('My\\Namespaced\\CoolClass', definitionFactory);

            expect(this.state.defineClass).to.have.been.calledOnce;
            expect(this.state.defineClass).to.have.been.calledWith(
                'My\\Namespaced\\CoolClass',
                sinon.match.same(definitionFactory)
            );
        });
    });

    describe('defineCoercingFunction()', function () {
        it('should define the function on the state', function () {
            var myFunction = sinon.stub();

            this.environment.defineCoercingFunction('my_func', myFunction);

            expect(this.state.defineCoercingFunction).to.have.been.calledOnce;
            expect(this.state.defineCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction)
            );
        });
    });

    describe('defineConstant()', function () {
        it('should define a constant on the state', function () {
            this.environment.defineConstant('MY_CONST', 21, {caseInsensitive: true});

            expect(this.state.defineConstant).to.have.been.calledOnce;
            expect(this.state.defineConstant).to.have.been.calledWith(
                'MY_CONST',
                21,
                {caseInsensitive: true}
            );
        });
    });

    describe('defineGlobal()', function () {
        it('should define the global on the state', function () {
            var value = sinon.createStubInstance(Value);
            this.environment.defineGlobal('myGlobal', value);

            expect(this.state.defineGlobal).to.have.been.calledOnce;
            expect(this.state.defineGlobal).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(value)
            );
        });
    });

    describe('defineGlobalAccessor()', function () {
        it('should define the global on the state', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            this.environment.defineGlobalAccessor('myGlobal', valueGetter, valueSetter);

            expect(this.state.defineGlobalAccessor).to.have.been.calledOnce;
            expect(this.state.defineGlobalAccessor).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter)
            );
        });
    });

    describe('defineNonCoercingFunction()', function () {
        it('should define the function on the state', function () {
            var myFunction = sinon.stub();

            this.environment.defineNonCoercingFunction('my_func', myFunction);

            expect(this.state.defineNonCoercingFunction).to.have.been.calledOnce;
            expect(this.state.defineNonCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction)
            );
        });
    });

    describe('defineSuperGlobal()', function () {
        it('should define the super global on the state', function () {
            var value = sinon.createStubInstance(Value);
            this.environment.defineSuperGlobal('myGlobal', value);

            expect(this.state.defineSuperGlobal).to.have.been.calledOnce;
            expect(this.state.defineSuperGlobal).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(value)
            );
        });
    });

    describe('defineSuperGlobalAccessor()', function () {
        it('should define the super global on the state', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            this.environment.defineSuperGlobalAccessor('myGlobal', valueGetter, valueSetter);

            expect(this.state.defineSuperGlobalAccessor).to.have.been.calledOnce;
            expect(this.state.defineSuperGlobalAccessor).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter)
            );
        });
    });

    describe('getConstant()', function () {
        it('should return the constant from the state', function () {
            this.state.getConstant.withArgs('MY_CONST').returns(21);

            expect(this.environment.getConstant('MY_CONST')).to.equal(21);
        });
    });

    describe('getOptions()', function () {
        it('should return the raw options object from the PHPState', function () {
            var options = {'my-option': 27};

            this.state.getOptions.returns(options);

            expect(this.environment.getOptions()).to.deep.equal(options);
        });
    });

    describe('reportError()', function () {
        beforeEach(function () {
            this.errorReporting = sinon.createStubInstance(ErrorReporting);
            this.state.getErrorReporting.returns(this.errorReporting);
        });

        it('should report a PHPFatalError via ErrorReporting correctly', function () {
            this.environment.reportError(
                new PHPFatalError(
                    'My fatal error message',
                    '/path/to/my_module.php',
                    1234
                )
            );

            expect(this.errorReporting.reportError).to.have.been.calledOnce;
            expect(this.errorReporting.reportError).to.have.been.calledWith(
                PHPError.E_ERROR,
                'My fatal error message',
                '/path/to/my_module.php',
                1234,
                null,
                false
            );
        });

        it('should report a PHPParseError via ErrorReporting correctly', function () {
            this.environment.reportError(
                new PHPParseError(
                    'My parse error message',
                    '/path/to/my_module.php',
                    1234
                )
            );

            expect(this.errorReporting.reportError).to.have.been.calledOnce;
            expect(this.errorReporting.reportError).to.have.been.calledWith(
                PHPError.E_PARSE,
                'My parse error message',
                '/path/to/my_module.php',
                1234,
                null,
                false
            );
        });

        it('should throw when an unsupported type of error is given', function () {
            expect(function () {
                this.environment.reportError(new Error('I am not a PHPError'));
            }.bind(this)).to.throw('Invalid error type given');
        });
    });
});
