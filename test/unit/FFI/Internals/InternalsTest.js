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
    tools = require('../../tools'),
    CallFactory = require('../../../../src/CallFactory'),
    CallStack = require('../../../../src/CallStack'),
    ClassAutoloader = require('../../../../src/ClassAutoloader').sync(),
    ControlFactory = require('../../../../src/Control/ControlFactory'),
    ControlScope = require('../../../../src/Control/ControlScope'),
    Environment = require('../../../../src/Environment'),
    ErrorConfiguration = require('../../../../src/Error/ErrorConfiguration'),
    ErrorPromoter = require('../../../../src/Error/ErrorPromoter'),
    ErrorReporting = require('../../../../src/Error/ErrorReporting'),
    Evaluator = require('../../../../src/Load/Evaluator'),
    FFIResult = require('../../../../src/FFI/Result'),
    Flow = require('../../../../src/Control/Flow'),
    Future = require('../../../../src/Control/Future'),
    FutureFactory = require('../../../../src/Control/FutureFactory'),
    Namespace = require('../../../../src/Namespace').sync(),
    NamespaceContext = require('../../../../src/Namespace/NamespaceContext'),
    Includer = require('../../../../src/Load/Includer').sync(),
    INIState = require('../../../../src/INIState'),
    Internals = require('../../../../src/FFI/Internals/Internals'),
    OnceIncluder = require('../../../../src/Load/OnceIncluder').sync(),
    OptionSet = require('../../../../src/OptionSet'),
    Output = require('../../../../src/Output/Output'),
    PHPState = require('../../../../src/PHPState').sync(),
    Reference = require('../../../../src/Reference/Reference'),
    ReferenceFactory = require('../../../../src/ReferenceFactory').sync(),
    Runtime = require('../../../../src/Runtime').sync(),
    Scope = require('../../../../src/Scope').sync(),
    Stream = require('../../../../src/Stream'),
    TraceFormatter = require('../../../../src/Error/TraceFormatter'),
    Translator = phpCommon.Translator,
    TypedFunction = require('../../../../src/Function/TypedFunction'),
    Userland = require('../../../../src/Control/Userland'),
    Value = require('../../../../src/Value').sync(),
    ValueFactory = require('../../../../src/ValueFactory').sync(),
    ValueHelper = require('../../../../src/FFI/Value/ValueHelper'),
    ValueProvider = require('../../../../src/Value/ValueProvider');

describe('FFI Internals', function () {
    var callFactory,
        callStack,
        classAutoloader,
        controlFactory,
        controlScope,
        createInternals,
        environment,
        errorConfiguration,
        errorPromoter,
        errorReporting,
        evaluator,
        flow,
        futureFactory,
        globalNamespace,
        globalScope,
        includer,
        iniState,
        internals,
        namespaceContext,
        onceIncluder,
        optionSet,
        output,
        realFutureFactory,
        realState,
        realValueFactory,
        referenceFactory,
        runtime,
        state,
        stdout,
        traceFormatter,
        translator,
        userland,
        valueFactory,
        valueHelper,
        valueProvider;

    beforeEach(function () {
        callFactory = sinon.createStubInstance(CallFactory);
        callStack = sinon.createStubInstance(CallStack);
        realState = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        realFutureFactory = realState.getFutureFactory();
        realValueFactory = realState.getValueFactory();
        classAutoloader = sinon.createStubInstance(ClassAutoloader);
        controlFactory = sinon.createStubInstance(ControlFactory);
        controlScope = sinon.createStubInstance(ControlScope);
        environment = sinon.createStubInstance(Environment);
        errorConfiguration = sinon.createStubInstance(ErrorConfiguration);
        errorPromoter = sinon.createStubInstance(ErrorPromoter);
        errorReporting = sinon.createStubInstance(ErrorReporting);
        evaluator = sinon.createStubInstance(Evaluator);
        flow = sinon.createStubInstance(Flow);
        futureFactory = sinon.createStubInstance(FutureFactory);
        globalNamespace = sinon.createStubInstance(Namespace);
        globalScope = sinon.createStubInstance(Scope);
        includer = sinon.createStubInstance(Includer);
        iniState = sinon.createStubInstance(INIState);
        namespaceContext = sinon.createStubInstance(NamespaceContext);
        onceIncluder = sinon.createStubInstance(OnceIncluder);
        optionSet = sinon.createStubInstance(OptionSet);
        output = sinon.createStubInstance(Output);
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        runtime = sinon.createStubInstance(Runtime);
        state = sinon.createStubInstance(PHPState);
        stdout = sinon.createStubInstance(Stream);
        traceFormatter = sinon.createStubInstance(TraceFormatter);
        translator = sinon.createStubInstance(Translator);
        userland = sinon.createStubInstance(Userland);
        valueFactory = sinon.createStubInstance(ValueFactory);
        valueHelper = sinon.createStubInstance(ValueHelper);
        valueProvider = sinon.createStubInstance(ValueProvider);

        createInternals = function (mode) {
            internals = new Internals(
                mode,
                userland,
                flow,
                controlScope,
                namespaceContext,
                includer,
                onceIncluder,
                evaluator,
                valueFactory,
                valueProvider,
                referenceFactory,
                controlFactory,
                futureFactory,
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
                state,
                environment
            );
        };
        createInternals('async');
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

        it('should expose the ControlFactory publicly', function () {
            expect(internals.controlFactory).to.equal(controlFactory);
        });

        it('should expose the ControlScope publicly', function () {
            expect(internals.controlScope).to.equal(controlScope);
        });

        it('should expose the Environment publicly', function () {
            expect(internals.environment).to.equal(environment);
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

        it('should expose the Evaluator publicly', function () {
            expect(internals.evaluator).to.equal(evaluator);
        });

        it('should expose Flow publicly', function () {
            expect(internals.flow).to.equal(flow);
        });

        it('should expose the FutureFactory publicly', function () {
            expect(internals.futureFactory).to.equal(futureFactory);
        });

        it('should expose the global Namespace publicly', function () {
            expect(internals.globalNamespace).to.equal(globalNamespace);
        });

        it('should expose the global Scope publicly', function () {
            expect(internals.globalScope).to.equal(globalScope);
        });

        it('should expose the Includer publicly', function () {
            expect(internals.includer).to.equal(includer);
        });

        it('should expose the INIState publicly', function () {
            expect(internals.iniState).to.equal(iniState);
        });

        it('should expose the mode publicly', function () {
            expect(internals.mode).to.equal('async');
        });

        it('should expose the NamespaceContext publicly', function () {
            expect(internals.namespaceContext).to.equal(namespaceContext);
        });

        it('should expose the OnceIncluder publicly', function () {
            expect(internals.onceIncluder).to.equal(onceIncluder);
        });

        it('should expose the OptionSet publicly', function () {
            expect(internals.optionSet).to.equal(optionSet);
        });

        it('should expose the Output publicly', function () {
            expect(internals.output).to.equal(output);
        });

        it('should expose the ReferenceFactory publicly', function () {
            expect(internals.referenceFactory).to.equal(referenceFactory);
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

        it('should expose Userland publicly', function () {
            expect(internals.userland).to.equal(userland);
        });

        it('should expose the ValueFactory publicly', function () {
            expect(internals.valueFactory).to.equal(valueFactory);
        });

        it('should expose the ValueHelper publicly', function () {
            expect(internals.valueHelper).to.equal(valueHelper);
        });

        it('should expose the ValueProvider publicly', function () {
            expect(internals.valueProvider).to.equal(valueProvider);
        });
    });

    describe('createAsyncMacrotaskFutureValue()', function () {
        it('should return a Future created via the ValueFactory', function () {
            var executor = sinon.stub(),
                future = sinon.createStubInstance(Future);
            valueFactory.createAsyncMacrotaskFuture
                .withArgs(sinon.match.same(executor))
                .returns(future);

            expect(internals.createAsyncMacrotaskFutureValue(executor)).to.equal(future);
        });
    });

    describe('createAsyncMicrotaskFutureValue()', function () {
        it('should return a Future created via the ValueFactory', function () {
            var executor = sinon.stub(),
                future = sinon.createStubInstance(Future);
            valueFactory.createAsyncMicrotaskFuture
                .withArgs(sinon.match.same(executor))
                .returns(future);

            expect(internals.createAsyncMicrotaskFutureValue(executor)).to.equal(future);
        });
    });

    describe('createAsyncPresent()', function () {
        it('should return an async Future created via the FutureFactory', function () {
            var future = sinon.createStubInstance(Future),
                value = 'my value';
            futureFactory.createAsyncPresent
                .withArgs(value)
                .returns(future);

            expect(internals.createAsyncPresent(value)).to.equal(future);
        });
    });

    describe('createAsyncPresentValue()', function () {
        it('should return an async Future created via the ValueFactory', function () {
            var future = sinon.createStubInstance(Future),
                value = realValueFactory.createString('my value');
            valueFactory.createAsyncPresent
                .withArgs(sinon.match.same(value))
                .returns(future);

            expect(internals.createAsyncPresentValue(value)).to.equal(future);
        });
    });

    describe('createAsyncRejection()', function () {
        it('should return an async Future created via the FutureFactory', function () {
            var future = sinon.createStubInstance(Future),
                error = new Error('Bang!');
            futureFactory.createAsyncRejection
                .withArgs(error)
                .returns(future);

            expect(internals.createAsyncRejection(error)).to.equal(future);
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

    describe('createFuture()', function () {
        it('should return a Future created via the FutureFactory', function () {
            var executor = sinon.stub(),
                future = sinon.createStubInstance(Future);
            futureFactory.createFuture
                .withArgs(sinon.match.same(executor))
                .returns(future);

            expect(internals.createFuture(executor)).to.equal(future);
        });
    });

    describe('createFutureValue()', function () {
        it('should return a Future created via the ValueFactory', function () {
            var executor = sinon.stub(),
                future = sinon.createStubInstance(Future);
            valueFactory.createFuture
                .withArgs(sinon.match.same(executor))
                .returns(future);

            expect(internals.createFutureValue(executor)).to.equal(future);
        });
    });

    describe('createPresent()', function () {
        it('should return a present Future created via the FutureFactory', function () {
            var future = sinon.createStubInstance(Future);
            futureFactory.createPresent
                .withArgs('my value')
                .returns(future);

            expect(internals.createPresent('my value')).to.equal(future);
        });
    });

    describe('createPresentValue()', function () {
        it('should return a settled Future created via the ValueFactory', function () {
            var future = sinon.createStubInstance(Future),
                value = sinon.createStubInstance(Value);
            valueFactory.createPresent
                .withArgs(sinon.match.same(value))
                .returns(future);

            expect(internals.createPresentValue(value)).to.equal(future);
        });
    });

    describe('createRejection()', function () {
        it('should return a rejected Future created via the FutureFactory', function () {
            var error = new Error('my error'),
                future = sinon.createStubInstance(Future);
            futureFactory.createRejection
                .withArgs(sinon.match.same(error))
                .returns(future);

            expect(internals.createRejection(error)).to.equal(future);
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
            var globalValue = sinon.createStubInstance(Value);
            state.getGlobal
                .withArgs('myGlobal')
                .returns(globalValue);

            expect(internals.getGlobal('myGlobal')).to.equal(globalValue);
        });
    });

    describe('getService()', function () {
        it('should fetch the specified service from the state', function () {
            var myService = {my: 'service'};
            state.getService
                .withArgs('my_service')
                .returns(myService);

            expect(internals.getService('my_service')).to.equal(myService);
        });
    });

    describe('implyArray()', function () {
        var reference;

        beforeEach(function () {
            reference = sinon.createStubInstance(Reference);

            futureFactory.createPresent.callsFake(function (value) {
                return realFutureFactory.createPresent(value);
            });
            valueFactory.createArray.callsFake(function (value) {
                return realValueFactory.createArray(value);
            });

            reference.getValue.returns(realValueFactory.createNull());
            reference.isDefined.returns(false);
            reference.isEmpty.returns(realFutureFactory.createAsyncPresent(true));
            reference.setValue.callsFake(function (value) {
                reference.getValue.returns(value);

                return value;
            });
        });

        it('should assign an empty array to an undefined and empty reference', async function () {
            await internals.implyArray(reference).toPromise();

            expect(reference.setValue).to.have.been.calledOnce;
            expect(reference.setValue.args[0][0].getType()).to.equal('array');
            expect(reference.setValue.args[0][0].getNative()).to.deep.equal([]);
        });

        it('should assign an empty array to a defined reference with value null', async function () {
            reference.isDefined.returns(true);

            await internals.implyArray(reference).toPromise();

            expect(reference.setValue).to.have.been.calledOnce;
            expect(reference.setValue.args[0][0].getType()).to.equal('array');
            expect(reference.setValue.args[0][0].getNative()).to.deep.equal([]);
        });

        it('should not assign an empty array to a defined empty but non-null reference', async function () {
            reference.getValue.returns(realValueFactory.createInteger(0));
            reference.isDefined.returns(true);

            await internals.implyArray(reference).toPromise();

            expect(reference.setValue).not.to.have.been.called;
        });

        // Note that if the reference is not defined, it may still be non-empty,
        // if for example it is a virtual property fetched with ->__get().
        it('should not assign an empty array to an undefined but non-empty reference', async function () {
            reference.isEmpty.returns(realFutureFactory.createAsyncPresent(false));

            await internals.implyArray(reference).toPromise();

            expect(reference.setValue).not.to.have.been.called;
        });

        it('should return the value of a defined reference containing an array', async function () {
            var resultValue;
            reference.getValue.returns(realValueFactory.createArray([21]));
            reference.isDefined.returns(true);

            resultValue = await internals.implyArray(reference).toPromise();

            expect(resultValue.getType()).to.equal('array');
            expect(resultValue.getNative()).to.deep.equal([21]);
        });

        it('should return the value of a defined reference containing a non-array such as integer', async function () {
            var resultValue;
            reference.getValue.returns(realValueFactory.createInteger(21));
            reference.isDefined.returns(true);

            resultValue = await internals.implyArray(reference).toPromise();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(21);
        });

        it('should return the empty array assigned to a defined reference with value null', async function () {
            var resultValue;
            reference.getValue.returns(realValueFactory.createNull());
            reference.isDefined.returns(true);

            resultValue = await internals.implyArray(reference).toPromise();

            expect(resultValue.getType()).to.equal('array');
            expect(resultValue.getNative()).to.deep.equal([]);
        });

        // Note that if the reference is not defined, it may still be non-empty,
        // if for example it is a virtual property fetched with ->__get().
        it('should return the value of an undefined but non-empty reference', async function () {
            var resultValue;
            reference.getValue.returns(realValueFactory.createString('my value'));
            reference.isEmpty.returns(realFutureFactory.createAsyncPresent(false));

            resultValue = await internals.implyArray(reference).toPromise();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('my value');
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
            var value = sinon.createStubInstance(Value);

            internals.setGlobal('myGlobal', value);

            expect(state.setGlobal).to.have.been.calledOnce;
            expect(state.setGlobal).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(value)
            );
        });
    });

    describe('typeFunction()', function () {
        it('should return a TypedFunction with the given signature and inner function', function () {
            var innerFunction = sinon.stub(),
                typedFunction = internals.typeFunction('iterable $myIterable = null', innerFunction);

            expect(typedFunction).to.be.an.instanceOf(TypedFunction);
            expect(typedFunction.getSignature()).to.equal('iterable $myIterable = null');
            expect(typedFunction.getFunction()).to.equal(innerFunction);
        });
    });
});
