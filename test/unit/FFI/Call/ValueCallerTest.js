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
    Caller = require('../../../../src/FFI/Call/Caller').sync(),
    ValueCaller = require('../../../../src/FFI/Call/ValueCaller').sync(),
    ObjectValue = require('../../../../src/Value/Object').sync(),
    Promise = require('lie'),
    ValueFactory = require('../../../../src/ValueFactory').sync();

describe('ValueCaller', function () {
    var caller,
        createCaller,
        objectValue,
        valueCaller,
        valueFactory;

    beforeEach(function () {
        caller = sinon.createStubInstance(Caller);
        objectValue = sinon.createStubInstance(ObjectValue);
        valueFactory = new ValueFactory();

        createCaller = function (mode) {
            valueCaller = new ValueCaller(caller, mode);
        };
    });

    describe('callMethod()', function () {
        var arg1,
            arg2;

        beforeEach(function () {
            arg1 = valueFactory.createString('first arg');
            arg2 = valueFactory.createString('second arg');
        });

        describe('in async mode', function () {
            beforeEach(function () {
                createCaller('async');

                caller.callMethodAsync
                    .withArgs(sinon.match.same(objectValue), 'myMethod', [
                        sinon.match.same(arg1),
                        sinon.match.same(arg2)
                    ])
                    .returns(Promise.resolve(valueFactory.createString('my result')));
            });

            it('should push an FFICall onto the stack', function () {
                return valueCaller.callMethod(objectValue, 'myMethod', [arg1, arg2]).then(function () {
                    expect(caller.pushFFICall).to.have.been.calledOnce;
                    expect(caller.pushFFICall).to.have.been.calledWith([
                        sinon.match.same(arg1),
                        sinon.match.same(arg2)
                    ]);
                });
            });

            it('should call the method asynchronously via the Caller, returning the result Value', function () {
                return valueCaller.callMethod(objectValue, 'myMethod', [arg1, arg2]).then(function (resultValue) {
                    expect(resultValue.getType()).to.equal('string');
                    expect(resultValue.getNative()).to.equal('my result');
                });
            });
        });

        describe('in psync mode with useSyncApiAlthoughPsync=false', function () {
            beforeEach(function () {
                createCaller('psync');

                caller.callMethodSyncLike
                    .withArgs(sinon.match.same(objectValue), 'myMethod', [
                        sinon.match.same(arg1),
                        sinon.match.same(arg2)
                    ])
                    .returns(Promise.resolve(valueFactory.createString('my result')));
            });

            it('should push an FFICall onto the stack', function () {
                return valueCaller.callMethod(objectValue, 'myMethod', [arg1, arg2]).then(function () {
                    expect(caller.pushFFICall).to.have.been.calledOnce;
                    expect(caller.pushFFICall).to.have.been.calledWith([
                        sinon.match.same(arg1),
                        sinon.match.same(arg2)
                    ]);
                });
            });

            it('should call the method asynchronously via the Caller, returning the result Value', function () {
                return valueCaller.callMethod(objectValue, 'myMethod', [arg1, arg2]).then(function (resultValue) {
                    expect(resultValue.getType()).to.equal('string');
                    expect(resultValue.getNative()).to.equal('my result');
                });
            });
        });

        describe('in psync mode with useSyncApiAlthoughPsync=true', function () {
            beforeEach(function () {
                createCaller('psync');

                caller.callMethodSyncLike
                    .withArgs(sinon.match.same(objectValue), 'myMethod', [
                        sinon.match.same(arg1),
                        sinon.match.same(arg2)
                    ])
                    .returns(valueFactory.createString('my result'));
            });

            it('should push an FFICall onto the stack', function () {
                valueCaller.callMethod(objectValue, 'myMethod', [arg1, arg2], true);

                expect(caller.pushFFICall).to.have.been.calledOnce;
                expect(caller.pushFFICall).to.have.been.calledWith([
                    sinon.match.same(arg1),
                    sinon.match.same(arg2)
                ]);
            });

            it('should call the method asynchronously via the Caller, returning the result Value', function () {
                var resultValue = valueCaller.callMethod(objectValue, 'myMethod', [arg1, arg2], true);

                expect(resultValue.getType()).to.equal('string');
                expect(resultValue.getNative()).to.equal('my result');
            });
        });

        describe('in sync mode', function () {
            beforeEach(function () {
                createCaller('sync');

                caller.callMethodSyncLike
                    .withArgs(sinon.match.same(objectValue), 'myMethod', [
                        sinon.match.same(arg1),
                        sinon.match.same(arg2)
                    ])
                    .returns(valueFactory.createString('my result'));
            });

            it('should push an FFICall onto the stack', function () {
                valueCaller.callMethod(objectValue, 'myMethod', [arg1, arg2]);

                expect(caller.pushFFICall).to.have.been.calledOnce;
                expect(caller.pushFFICall).to.have.been.calledWith([
                    sinon.match.same(arg1),
                    sinon.match.same(arg2)
                ]);
            });

            it('should call the method asynchronously via the Caller, returning the result Value', function () {
                var resultValue = valueCaller.callMethod(objectValue, 'myMethod', [arg1, arg2]);

                expect(resultValue.getType()).to.equal('string');
                expect(resultValue.getNative()).to.equal('my result');
            });
        });
    });
});
