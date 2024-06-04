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
    FFIValueHelper = require('../../src/FFI/Value/ValueHelper'),
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError,
    PHPParseError = phpCommon.PHPParseError,
    PHPState = require('../../src/PHPState').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Environment', function () {
    var environment,
        ffiValueHelper,
        state,
        valueFactory;

    beforeEach(function () {
        ffiValueHelper = sinon.createStubInstance(FFIValueHelper);
        state = sinon.createStubInstance(PHPState);
        valueFactory = new ValueFactory();

        state.getFFIValueHelper.returns(ffiValueHelper);

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
        it('should return an FFIResult created via the PHPState', function () {
            var result = sinon.createStubInstance(FFIResult),
                asyncCallback = sinon.stub(),
                syncCallback = sinon.stub();
            state.createFFIResult
                .withArgs(sinon.match.same(syncCallback), sinon.match.same(asyncCallback))
                .returns(result);

            expect(environment.createFFIResult(syncCallback, asyncCallback)).to.equal(result);
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

            environment.defineCoercingFunction('my_func', myFunction, 'mixed $myParam = 21');

            expect(state.defineCoercingFunction).to.have.been.calledOnce;
            expect(state.defineCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction),
                'mixed $myParam = 21'
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

    describe('defineFunction()', function () {
        it('should define a function on the PHPState', function () {
            var myFunctionDefinitionFactory = sinon.stub();

            environment.defineFunction('My\\Fqcn', myFunctionDefinitionFactory);

            expect(state.defineFunction).to.have.been.calledOnce;
            expect(state.defineFunction).to.have.been.calledWith(
                'My\\Fqcn',
                sinon.match.same(myFunctionDefinitionFactory)
            );
        });

        it('should return the defined function from the PHPState', function () {
            var myFunctionDefinitionFactory = sinon.stub(),
                myFunctionObject = sinon.stub();
            state.defineFunction
                .withArgs('My\\Fqcn', sinon.match.same(myFunctionDefinitionFactory))
                .returns(myFunctionObject);

            expect(environment.defineFunction('My\\Fqcn', myFunctionDefinitionFactory))
                .to.equal(myFunctionObject);
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
            var definednessGetter = sinon.stub(),
                emptinessGetter = sinon.stub(),
                readablenessGetter = sinon.stub(),
                referenceClearer = sinon.stub(),
                referenceGetter = sinon.stub(),
                referencenessGetter = sinon.stub(),
                referenceSetter = sinon.stub(),
                setnessGetter = sinon.stub(),
                undefinednessRaiser = sinon.stub(),
                unsetter = sinon.stub(),
                valueGetter = sinon.stub(),
                valueSetter = sinon.stub();

            environment.defineGlobalAccessor(
                'my_global',
                valueGetter,
                valueSetter,
                unsetter,
                referenceGetter,
                referenceSetter,
                referenceClearer,
                definednessGetter,
                readablenessGetter,
                emptinessGetter,
                setnessGetter,
                referencenessGetter,
                undefinednessRaiser
            );

            expect(state.defineGlobalAccessor).to.have.been.calledOnce;
            expect(state.defineGlobalAccessor).to.have.been.calledWith(
                'my_global',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter),
                sinon.match.same(unsetter),
                sinon.match.same(referenceGetter),
                sinon.match.same(referenceSetter),
                sinon.match.same(referenceClearer),
                sinon.match.same(definednessGetter),
                sinon.match.same(readablenessGetter),
                sinon.match.same(emptinessGetter),
                sinon.match.same(setnessGetter),
                sinon.match.same(referencenessGetter),
                sinon.match.same(undefinednessRaiser)
            );
        });
    });

    describe('defineNonCoercingFunction()', function () {
        it('should define the function on the state', function () {
            var myFunction = sinon.stub();

            environment.defineNonCoercingFunction('my_func', myFunction, 'mixed $myParam = 21');

            expect(state.defineNonCoercingFunction).to.have.been.calledOnce;
            expect(state.defineNonCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction),
                'mixed $myParam = 21'
            );
        });
    });

    describe('defineOverloadedFunction()', function () {
        it('should define a function on the PHPState', function () {
            var myFunctionDefinitionFactory = sinon.stub();

            environment.defineOverloadedFunction('My\\Fqfn', myFunctionDefinitionFactory);

            expect(state.defineOverloadedFunction).to.have.been.calledOnce;
            expect(state.defineOverloadedFunction).to.have.been.calledWith(
                'My\\Fqfn',
                sinon.match.same(myFunctionDefinitionFactory)
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

    describe('getMode()', function () {
        it('should return the mode from the state', function () {
            state.getMode.returns('psync');

            expect(environment.getMode()).to.equal('psync');
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

    describe('toNativeWithSyncApi()', function () {
        it('should return a new sync-API ProxyClass instance via the PHPState', function () {
            var originalProxy = sinon.stub(),
                syncApiProxy = sinon.stub();
            ffiValueHelper.toNativeWithSyncApi
                .withArgs(sinon.match.same(originalProxy))
                .returns(syncApiProxy);

            expect(environment.toNativeWithSyncApi(originalProxy)).to.equal(syncApiProxy);
        });
    });
});
