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
    CallFactory = require('../../../../src/CallFactory'),
    CallStack = require('../../../../src/CallStack'),
    ClassAutoloader = require('../../../../src/ClassAutoloader').sync(),
    ErrorConfiguration = require('../../../../src/Error/ErrorConfiguration'),
    ErrorPromoter = require('../../../../src/Error/ErrorPromoter'),
    ErrorReporting = require('../../../../src/Error/ErrorReporting'),
    FFIResult = require('../../../../src/FFI/Result'),
    Namespace = require('../../../../src/Namespace').sync(),
    INIState = require('../../../../src/INIState'),
    Internals = require('../../../../src/FFI/Internals/Internals'),
    OptionSet = require('../../../../src/OptionSet'),
    Output = require('../../../../src/Output/Output'),
    PHPState = require('../../../../src/PHPState').sync(),
    Runtime = require('../../../../src/Runtime').sync(),
    Scope = require('../../../../src/Scope').sync(),
    Stream = require('../../../../src/Stream'),
    TraceFormatter = require('../../../../src/Error/TraceFormatter'),
    Translator = phpCommon.Translator,
    ValueFactory = require('../../../../src/ValueFactory').sync(),
    ValueHelper = require('../../../../src/FFI/Value/ValueHelper');

describe('FFI Internals', function () {
    var callFactory,
        callStack,
        classAutoloader,
        createInternals,
        errorConfiguration,
        errorPromoter,
        errorReporting,
        globalNamespace,
        globalScope,
        iniState,
        internals,
        optionSet,
        output,
        pausable,
        runtime,
        state,
        stdout,
        traceFormatter,
        translator,
        valueFactory,
        valueHelper;

    beforeEach(function () {
        callFactory = sinon.createStubInstance(CallFactory);
        callStack = sinon.createStubInstance(CallStack);
        classAutoloader = sinon.createStubInstance(ClassAutoloader);
        errorConfiguration = sinon.createStubInstance(ErrorConfiguration);
        errorPromoter = sinon.createStubInstance(ErrorPromoter);
        errorReporting = sinon.createStubInstance(ErrorReporting);
        globalNamespace = sinon.createStubInstance(Namespace);
        globalScope = sinon.createStubInstance(Scope);
        iniState = sinon.createStubInstance(INIState);
        optionSet = sinon.createStubInstance(OptionSet);
        output = sinon.createStubInstance(Output);
        pausable = {};
        runtime = sinon.createStubInstance(Runtime);
        state = sinon.createStubInstance(PHPState);
        stdout = sinon.createStubInstance(Stream);
        traceFormatter = sinon.createStubInstance(TraceFormatter);
        translator = sinon.createStubInstance(Translator);
        valueFactory = new ValueFactory();
        valueHelper = sinon.createStubInstance(ValueHelper);

        createInternals = function (mode, pausable) {
            internals = new Internals(
                mode,
                pausable || null,
                valueFactory,
                callFactory,
                callStack,
                valueHelper,
                classAutoloader,
                errorConfiguration,
                errorPromoter,
                errorReporting,
                globalNamespace,
                globalScope,
                iniState,
                optionSet,
                output,
                runtime,
                stdout,
                traceFormatter,
                translator,
                state
            );
        };
        createInternals('async', pausable);
    });

    describe('constructor()', function () {
        it('should expose the CallFactory publicly', function () {
            expect(internals.callFactory).to.equal(callFactory);
        });

        it('should expose the CallStack publicly', function () {
            expect(internals.callStack).to.equal(callStack);
        });

        it('should expose the ClassAutoloader publicly', function () {
            expect(internals.classAutoloader).to.equal(classAutoloader);
        });

        it('should expose the ErrorConfiguration publicly', function () {
            expect(internals.errorConfiguration).to.equal(errorConfiguration);
        });

        it('should expose the ErrorPromoter publicly', function () {
            expect(internals.errorPromoter).to.equal(errorPromoter);
        });

        it('should expose the ErrorReporting publicly', function () {
            expect(internals.errorReporting).to.equal(errorReporting);
        });

        it('should expose the global Namespace publicly', function () {
            expect(internals.globalNamespace).to.equal(globalNamespace);
        });

        it('should expose the global Scope publicly', function () {
            expect(internals.globalScope).to.equal(globalScope);
        });

        it('should expose the INIState publicly', function () {
            expect(internals.iniState).to.equal(iniState);
        });

        it('should expose the mode publicly', function () {
            expect(internals.mode).to.equal('async');
        });

        it('should expose the OptionSet publicly', function () {
            expect(internals.optionSet).to.equal(optionSet);
        });

        it('should expose the Output publicly', function () {
            expect(internals.output).to.equal(output);
        });

        it('should expose Pausable publicly', function () {
            expect(internals.pausable).to.equal(pausable);
        });

        it('should expose the Runtime publicly', function () {
            expect(internals.runtime).to.equal(runtime);
        });

        it('should expose the PHPState publicly', function () {
            expect(internals.state).to.equal(state);
        });

        it('should expose the stdout Stream publicly', function () {
            expect(internals.stdout).to.equal(stdout);
        });

        it('should expose the TraceFormatter publicly', function () {
            expect(internals.traceFormatter).to.equal(traceFormatter);
        });

        it('should expose the Translator publicly', function () {
            expect(internals.translator).to.equal(translator);
        });

        it('should expose the ValueFactory publicly', function () {
            expect(internals.valueFactory).to.equal(valueFactory);
        });

        it('should expose the ValueHelper publicly', function () {
            expect(internals.valueHelper).to.equal(valueHelper);
        });

        it('should throw when async mode is specified but Pausable is not', function () {
            expect(function () {
                createInternals('async', null);
            }).to.throw('Pausable is required for async mode');
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

            expect(internals.createFFIResult(syncCallback, asyncCallback)).to.equal(result);
        });
    });

    describe('getBinding()', function () {
        it('should fetch the given binding from the PHPState', function () {
            var binding = {my: 'binding value'};
            state.getBinding
                .withArgs('my_binding')
                .returns(binding);

            expect(internals.getBinding('my_binding')).to.equal(binding);
        });
    });

    describe('getConstant()', function () {
        it('should fetch the given constant\'s native value from the PHPState', function () {
            state.getConstant
                .withArgs('MY_CONST')
                .returns(1234);

            expect(internals.getConstant('MY_CONST')).to.equal(1234);
        });
    });

    describe('getGlobal()', function () {
        it('should fetch the given global variable\'s Value from the PHPState', function () {
            var globalValue = valueFactory.createString('my global value');
            state.getGlobal
                .withArgs('myGlobal')
                .returns(globalValue);

            expect(internals.getGlobal('myGlobal')).to.equal(globalValue);
        });
    });

    describe('isAsync()', function () {
        it('should return true for async mode', function () {
            expect(internals.isAsync()).to.be.true;
        });

        it('should return false for psync mode', function () {
            createInternals('psync');

            expect(internals.isAsync()).to.be.false;
        });

        it('should return false for sync mode', function () {
            createInternals('sync');

            expect(internals.isAsync()).to.be.false;
        });
    });

    describe('isPsync()', function () {
        it('should return false for async mode', function () {
            expect(internals.isPsync()).to.be.false;
        });

        it('should return true for psync mode', function () {
            createInternals('psync');

            expect(internals.isPsync()).to.be.true;
        });

        it('should return false for sync mode', function () {
            createInternals('sync');

            expect(internals.isPsync()).to.be.false;
        });
    });

    describe('isSync()', function () {
        it('should return false for async mode', function () {
            expect(internals.isSync()).to.be.false;
        });

        it('should return false for psync mode', function () {
            createInternals('psync');

            expect(internals.isSync()).to.be.false;
        });

        it('should return true for sync mode', function () {
            createInternals('sync');

            expect(internals.isSync()).to.be.true;
        });
    });

    describe('setGlobal()', function () {
        it('should set the given global variable\'s value via the PHPState', function () {
            var value = valueFactory.createString('my global');

            internals.setGlobal('myGlobal', value);

            expect(state.setGlobal).to.have.been.calledOnce;
            expect(state.setGlobal).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(value)
            );
        });
    });
});
