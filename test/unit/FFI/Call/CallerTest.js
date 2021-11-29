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
    Call = require('../../../../src/Call'),
    CallFactory = require('../../../../src/CallFactory'),
    CallStack = require('../../../../src/CallStack'),
    Caller = require('../../../../src/FFI/Call/Caller').sync(),
    ErrorPromoter = require('../../../../src/Error/ErrorPromoter'),
    Exception = phpCommon.Exception,
    FFICall = require('../../../../src/FFI/Call'),
    ObjectValue = require('../../../../src/Value/Object').sync(),
    Promise = require('lie');

describe('Caller', function () {
    var caller,
        callFactory,
        callStack,
        createCaller,
        currentFFICall,
        errorPromoter,
        futureFactory,
        objectValue,
        resolveCall,
        state,
        valueFactory;

    beforeEach(function () {
        callFactory = sinon.createStubInstance(CallFactory);
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState(null, {
            'call_factory': callFactory,
            'call_stack': callStack
        });
        currentFFICall = sinon.createStubInstance(FFICall);
        errorPromoter = sinon.createStubInstance(ErrorPromoter);
        futureFactory = state.getFutureFactory();
        objectValue = sinon.createStubInstance(ObjectValue);
        valueFactory = state.getValueFactory();

        callStack.getCurrent.returns(currentFFICall);
        objectValue.callMethod.returns(valueFactory.createFuture(function (resolve) {
            resolveCall = resolve;
        }));
        objectValue.getType.returns('object');

        createCaller = function (mode) {
            caller = new Caller(
                callFactory,
                callStack,
                errorPromoter,
                state.getFlow(),
                mode || 'async'
            );
        };
    });

    describe('callMethodAsync()', function () {
        describe('in asynchronous mode', function () {
            beforeEach(function () {
                createCaller('async');
            });

            it('should return a Promise', function () {
                expect(caller.callMethodAsync(objectValue, 'myMethod', [
                    valueFactory.createInteger(21),
                    valueFactory.createInteger(23)
                ]))
                    .to.be.an.instanceOf(Promise);
            });

            it('should resolve the Promise when the call returns', function () {
                var promise = caller.callMethodAsync(objectValue, 'myMethod', [
                    valueFactory.createInteger(21),
                    valueFactory.createInteger(23)
                ]);

                resolveCall(valueFactory.createString('my result'));

                return expect(promise).to.eventually.be.fulfilled;
            });

            it('should resolve with the result when the call returns', function () {
                var promise = caller.callMethodAsync(objectValue, 'myMethod', [
                    valueFactory.createInteger(21),
                    valueFactory.createInteger(23)
                ]);

                resolveCall(valueFactory.createString('my result'));

                return promise.then(function (resultValue) {
                    expect(resultValue.getType()).to.equal('string');
                    expect(resultValue.getNative()).to.equal('my result');
                });
            });
        });

        describe('in synchronous mode', function () {
            beforeEach(function () {
                createCaller('sync');
            });

            it('should throw an Exception', function () {
                expect(function () {
                    caller.callMethodAsync(objectValue, 'myMethod', [
                        valueFactory.createInteger(21)
                    ]);
                }).to.throw(Exception, 'Caller.callMethodAsync() :: Must be in async mode');
            });
        });

        describe('in Promise-synchronous mode', function () {
            beforeEach(function () {
                createCaller('psync');
            });

            it('should throw an Exception', function () {
                expect(function () {
                    caller.callMethodAsync(objectValue, 'myMethod', [
                        valueFactory.createInteger(21)
                    ]);
                }).to.throw(Exception, 'Caller.callMethodAsync() :: Must be in async mode');
            });
        });
    });

    describe('callMethodSyncLike()', function () {
        describe('in asynchronous mode', function () {
            beforeEach(function () {
                createCaller('async');
            });

            it('should throw an Exception', function () {
                expect(function () {
                    caller.callMethodSyncLike(objectValue, 'myMethod', [
                        valueFactory.createInteger(21)
                    ]);
                }).to.throw(Exception, 'callMethodSyncLike() :: Cannot call in async mode');
            });
        });

        describe('in synchronous mode', function () {
            beforeEach(function () {
                createCaller('sync');
            });

            it('should return the wrapped result', function () {
                var resultValue;
                objectValue.callMethod.returns(valueFactory.createString('my synchronous result'));

                resultValue = caller.callMethodSyncLike(objectValue, 'myMethod', [
                    valueFactory.createInteger(21),
                    valueFactory.createInteger(23)
                ]);

                expect(resultValue.getType()).to.equal('string');
                expect(resultValue.getNative()).to.equal('my synchronous result');
            });

            it('should not catch a non-PHP error', function () {
                objectValue.callMethod.returns(futureFactory.createRejection(new TypeError('A type error occurred')));

                expect(function () {
                    caller.callMethodSyncLike(objectValue, 'myMethod', []);
                }).to.throw(TypeError, 'A type error occurred');
            });

            it('should promote a PHP error to a native JS one and rethrow it as that', function () {
                var errorValue = sinon.createStubInstance(ObjectValue);
                errorValue.getType.returns('object');
                errorValue.yieldSync.throws(errorValue);
                errorPromoter.promote
                    .withArgs(sinon.match.same(errorValue))
                    .returns(new Error('My error, coerced from a PHP exception'));
                objectValue.callMethod.returns(errorValue);

                expect(function () {
                    caller.callMethodSyncLike(objectValue, 'myMethod', []);
                }).to.throw(Error, 'My error, coerced from a PHP exception');
            });
        });

        describe('in Promise-synchronous mode, sync unenforced', function () {
            beforeEach(function () {
                createCaller('psync');
            });

            it('should return a Promise', function () {
                expect(caller.callMethodSyncLike(objectValue, 'myMethod', [
                    valueFactory.createInteger(21),
                    valueFactory.createInteger(23)
                ]))
                    .to.be.an.instanceOf(Promise);
            });

            it('should return a Promise resolved with the synchronous result', function () {
                var promise;
                objectValue.callMethod.returns(valueFactory.createString('my synchronous result'));

                promise = caller.callMethodSyncLike(objectValue, 'myMethod', [
                    valueFactory.createInteger(21),
                    valueFactory.createInteger(23)
                ]);

                return promise.then(function (resultValue) {
                    expect(resultValue.getType()).to.equal('string');
                    expect(resultValue.getNative()).to.equal('my synchronous result');
                });
            });
        });

        describe('in Promise-synchronous mode, sync unenforced', function () {
            beforeEach(function () {
                createCaller('psync');
            });

            it('should return the synchronous result without wrapping it in a Promise', function () {
                var resultValue;
                objectValue.callMethod.returns(valueFactory.createString('my synchronous result'));

                resultValue = caller.callMethodSyncLike(objectValue, 'myMethod', [
                    valueFactory.createInteger(21),
                    valueFactory.createInteger(23)
                ], true);

                expect(resultValue.getType()).to.equal('string');
                expect(resultValue.getNative()).to.equal('my synchronous result');
            });
        });
    });

    describe('pushFFICall()', function () {
        beforeEach(function () {
            createCaller('sync');
        });

        it('should push an FFICall onto the stack', function () {
            var call;
            callFactory.createFFICall.callsFake(function (args) {
                var call = sinon.createStubInstance(FFICall);
                call.getFunctionArgs.returns(args);

                return call;
            });

            caller.pushFFICall([valueFactory.createInteger(7), valueFactory.createInteger(4)]);

            expect(callStack.push).to.have.been.calledOnce;
            call = callStack.push.args[0][0];
            expect(call).to.be.an.instanceOf(FFICall);
            expect(call.getFunctionArgs()[0].getNative()).to.equal(7);
            expect(call.getFunctionArgs()[1].getNative()).to.equal(4);
        });
    });

    describe('popFFICall()', function () {
        beforeEach(function () {
            createCaller('sync');
        });

        it('should pop the current FFICall off the stack', function () {
            var call = sinon.createStubInstance(FFICall);
            callStack.getCurrent.returns(call);

            caller.popFFICall();

            expect(callStack.pop).to.have.been.calledOnce;
        });

        it('should throw when the top of the stack is a non-FFI call', function () {
            var call = sinon.createStubInstance(Call);
            callStack.getCurrent.returns(call);

            expect(function () {
                caller.popFFICall();
            }).to.throw('Caller.popFFICall() :: Current call is not an FFI call');
        });
    });
});
