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
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Environment', function () {
    var environment,
        state,
        valueFactory;

    beforeEach(function () {
        state = sinon.createStubInstance(PHPState);
        valueFactory = new ValueFactory();

        environment = new Environment(state);
    });

    describe('aliasFunction()', function () {
        it('should alias the function via the PHPState', function () {
            environment.aliasFunction('originalFunc', 'aliasFunc');

            expect(state.aliasFunction).to.have.been.calledOnce;
            expect(state.aliasFunction).to.have.been.calledWith('originalFunc', 'aliasFunc');
        });
    });

    describe('createFFIResult()', function () {
        var asyncCallback,
            syncCallback;

        beforeEach(function () {
            asyncCallback = sinon.stub();
            syncCallback = sinon.stub();

            syncCallback.returns(21);
            asyncCallback.callsFake(function () {
                return Promise.resolve(101);
            });
        });

        it('should return an instance of FFI Result', function () {
            expect(environment.createFFIResult(syncCallback, asyncCallback)).to.be.an.instanceOf(FFIResult);
        });

        describe('the instance of FFI Result returned', function () {
            var ffiResult;

            beforeEach(function () {
                ffiResult = environment.createFFIResult(syncCallback, asyncCallback);
            });

            it('should be passed the sync callback correctly', function () {
                expect(ffiResult.getSync()).to.equal(21);
            });

            it('should be passed the async callback correctly', function () {
                expect(ffiResult.getAsync()).to.eventually.equal(101);
            });
        });
    });

    describe('defineClass()', function () {
        it('should define the class on the state', function () {
            var definitionFactory = sinon.stub();

            environment.defineClass('My\\Namespaced\\CoolClass', definitionFactory);

            expect(state.defineClass).to.have.been.calledOnce;
            expect(state.defineClass).to.have.been.calledWith(
                'My\\Namespaced\\CoolClass',
                sinon.match.same(definitionFactory)
            );
        });
    });

    describe('defineCoercingFunction()', function () {
        it('should define the function on the state', function () {
            var myFunction = sinon.stub();

            environment.defineCoercingFunction('my_func', myFunction);

            expect(state.defineCoercingFunction).to.have.been.calledOnce;
            expect(state.defineCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction)
            );
        });
    });

    describe('defineConstant()', function () {
        it('should define a constant on the state', function () {
            environment.defineConstant('MY_CONST', 21, {caseInsensitive: true});

            expect(state.defineConstant).to.have.been.calledOnce;
            expect(state.defineConstant).to.have.been.calledWith(
                'MY_CONST',
                21,
                {caseInsensitive: true}
            );
        });
    });

    describe('defineGlobal()', function () {
        it('should define the global on the state', function () {
            var value = sinon.createStubInstance(Value);
            environment.defineGlobal('myGlobal', value);

            expect(state.defineGlobal).to.have.been.calledOnce;
            expect(state.defineGlobal).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(value)
            );
        });
    });

    describe('defineGlobalAccessor()', function () {
        it('should define the global on the state', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            environment.defineGlobalAccessor('myGlobal', valueGetter, valueSetter);

            expect(state.defineGlobalAccessor).to.have.been.calledOnce;
            expect(state.defineGlobalAccessor).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter)
            );
        });
    });

    describe('defineNonCoercingFunction()', function () {
        it('should define the function on the state', function () {
            var myFunction = sinon.stub();

            environment.defineNonCoercingFunction('my_func', myFunction);

            expect(state.defineNonCoercingFunction).to.have.been.calledOnce;
            expect(state.defineNonCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction)
            );
        });
    });

    describe('defineSuperGlobal()', function () {
        it('should define the super global on the state', function () {
            var value = sinon.createStubInstance(Value);

            environment.defineSuperGlobal('myGlobal', value);

            expect(state.defineSuperGlobal).to.have.been.calledOnce;
            expect(state.defineSuperGlobal).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(value)
            );
        });
    });

    describe('defineSuperGlobalAccessor()', function () {
        it('should define the super global on the state', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            environment.defineSuperGlobalAccessor('myGlobal', valueGetter, valueSetter);

            expect(state.defineSuperGlobalAccessor).to.have.been.calledOnce;
            expect(state.defineSuperGlobalAccessor).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter)
            );
        });
    });

    describe('getConstant()', function () {
        it('should return the constant from the state', function () {
            state.getConstant.withArgs('MY_CONST').returns(21);

            expect(environment.getConstant('MY_CONST')).to.equal(21);
        });
    });

    describe('getGlobal()', function () {
        it('should return the value of the global from the PHPState', function () {
            state.getGlobal.withArgs('myGlobal').returns(valueFactory.createInteger(1234));

            expect(environment.getGlobal('myGlobal').getNative()).to.equal(1234);
        });
    });

    describe('getOptions()', function () {
        it('should return the raw options object from the PHPState', function () {
            var options = {'my-option': 27};

            state.getOptions.returns(options);

            expect(environment.getOptions()).to.deep.equal(options);
        });
    });

    describe('reportError()', function () {
        var errorReporting;

        beforeEach(function () {
            errorReporting = sinon.createStubInstance(ErrorReporting);
            state.getErrorReporting.returns(errorReporting);
        });

        it('should report a PHPFatalError via ErrorReporting correctly', function () {
            environment.reportError(
                new PHPFatalError(
                    'My fatal error message',
                    '/path/to/my_module.php',
                    1234
                )
            );

            expect(errorReporting.reportError).to.have.been.calledOnce;
            expect(errorReporting.reportError).to.have.been.calledWith(
                PHPError.E_ERROR,
                'My fatal error message',
                '/path/to/my_module.php',
                1234,
                null,
                false
            );
        });

        it('should report a PHPParseError via ErrorReporting correctly', function () {
            environment.reportError(
                new PHPParseError(
                    'My parse error message',
                    '/path/to/my_module.php',
                    1234
                )
            );

            expect(errorReporting.reportError).to.have.been.calledOnce;
            expect(errorReporting.reportError).to.have.been.calledWith(
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
                environment.reportError(new Error('I am not a PHPError'));
            }).to.throw('Invalid error type given');
        });
    });

    describe('setGlobal()', function () {
        it('should set the value of the global via the PHPState', function () {
            var value = valueFactory.createInteger(1234);

            environment.setGlobal('myGlobal', value);

            expect(state.setGlobal).to.have.been.calledOnce;
            expect(state.setGlobal).to.have.been.calledWith('myGlobal', sinon.match.same(value));
        });
    });
});
