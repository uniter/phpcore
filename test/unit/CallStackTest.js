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
    Call = require('../../src/Call'),
    CallStack = require('../../src/CallStack'),
    ObjectValue = require('../../src/Value/Object').sync(),
    Scope = require('../../src/Scope').sync(),
    Stream = require('../../src/Stream'),
    Value = require('../../src/Value').sync();

describe('CallStack', function () {
    beforeEach(function () {
        this.stderr = sinon.createStubInstance(Stream);

        this.callStack = new CallStack(this.stderr);
    });

    describe('getCurrent()', function () {
        it('should return the current Call when there are 3 on the stack', function () {
            var currentCall = sinon.createStubInstance(Call);
            this.callStack.push(sinon.createStubInstance(Call));
            this.callStack.push(sinon.createStubInstance(Call));
            this.callStack.push(currentCall);

            expect(this.callStack.getCurrent()).to.equal(currentCall);
        });
    });

    describe('getLastFilePath()', function () {
        it('should return the file path from the current Call', function () {
            var currentCall = sinon.createStubInstance(Call);
            this.callStack.push(sinon.createStubInstance(Call));
            this.callStack.push(currentCall);
            currentCall.getFilePath.returns('/my/current/module.php');

            expect(this.callStack.getLastFilePath()).to.equal('/my/current/module.php');
        });
    });

    describe('getLastLine()', function () {
        it('should return the line number inside the currently called function', function () {
            var currentCall = sinon.createStubInstance(Call);
            this.callStack.push(sinon.createStubInstance(Call));
            this.callStack.push(currentCall);
            currentCall.getLastLine.returns(27);

            expect(this.callStack.getLastLine()).to.equal(27);
        });
    });

    describe('getThisObject()', function () {
        it('should return the `$this` object from the scope of the current Call', function () {
            var currentCall = sinon.createStubInstance(Call),
                scope = sinon.createStubInstance(Scope),
                thisObjectValue = sinon.createStubInstance(ObjectValue);
            this.callStack.push(sinon.createStubInstance(Call));
            this.callStack.push(currentCall);
            currentCall.getScope.returns(scope);
            scope.getThisObject.returns(thisObjectValue);

            expect(this.callStack.getThisObject()).to.equal(thisObjectValue);
        });
    });

    describe('getTrace()', function () {
        it('should return an empty array when there are no calls on the stack', function () {
            expect(this.callStack.getTrace()).to.deep.equal([]);
        });

        describe('with three calls', function () {
            beforeEach(function () {
                this.firstCall = sinon.createStubInstance(Call);
                this.firstCall.getFilePath.returns('/path/to/oldest/call.php');
                this.firstCallArgs = [sinon.createStubInstance(Value)];
                this.firstCall.getFunctionArgs.returns(this.firstCallArgs);
                this.firstCall.getFunctionName.returns('myOldestCalledFunc');
                this.firstCall.getLastLine.returns(100);
                this.secondCall = sinon.createStubInstance(Call);
                this.secondCall.getFilePath.returns('/path/to/second/call.php');
                this.secondCallArgs = [sinon.createStubInstance(Value)];
                this.secondCall.getFunctionArgs.returns(this.secondCallArgs);
                this.secondCall.getFunctionName.returns('mySecondCalledFunc');
                this.secondCall.getLastLine.returns(21);
                this.thirdCall = sinon.createStubInstance(Call);
                this.thirdCall.getFilePath.returns('/path/to/newest/call.php');
                this.thirdCallArgs = [sinon.createStubInstance(Value)];
                this.thirdCall.getFunctionArgs.returns(this.thirdCallArgs);
                this.thirdCall.getFunctionName.returns('myMostRecentlyCalledFunc');
                this.thirdCall.getLastLine.returns(27);
                this.callStack.push(this.firstCall);
                this.callStack.push(this.secondCall);
                this.callStack.push(this.thirdCall);
            });

            it('should return a trace with three entries', function () {
                expect(this.callStack.getTrace()).to.have.length(3);
            });

            it('should give each entry the correct index, with index 0 as the most recent call', function () {
                var trace = this.callStack.getTrace();

                expect(trace[0].index).to.equal(0);
                expect(trace[1].index).to.equal(1);
                expect(trace[2].index).to.equal(2);
            });

            it('should give each entry the correct file path', function () {
                var trace = this.callStack.getTrace();

                expect(trace[0].file).to.equal('/path/to/newest/call.php');
                expect(trace[1].file).to.equal('/path/to/second/call.php');
                expect(trace[2].file).to.equal('/path/to/oldest/call.php');
            });

            it('should give each entry the correct line (from the previous call)', function () {
                var trace = this.callStack.getTrace();

                // We return the previous call's line number, as that is the line
                // the call was made from in the calling file
                expect(trace[0].line).to.equal(21);
                expect(trace[1].line).to.equal(100);
                expect(trace[2].line).to.be.null;
            });

            it('should give each entry the correct function name', function () {
                var trace = this.callStack.getTrace();

                expect(trace[0].func).to.equal('myMostRecentlyCalledFunc');
                expect(trace[1].func).to.equal('mySecondCalledFunc');
                expect(trace[2].func).to.equal('myOldestCalledFunc');
            });

            it('should give each entry the correct function args', function () {
                var trace = this.callStack.getTrace();

                expect(trace[0].args).to.equal(this.thirdCallArgs);
                expect(trace[1].args).to.equal(this.secondCallArgs);
                expect(trace[2].args).to.equal(this.firstCallArgs);
            });
        });
    });

    describe('instrumentCurrent()', function () {
        it('should instrument the current call with the provided finder', function () {
            var currentCall = sinon.createStubInstance(Call),
                finder = sinon.stub();
            this.callStack.push(currentCall);

            this.callStack.instrumentCurrent(finder);

            expect(currentCall.instrument).to.have.been.calledOnce;
            expect(currentCall.instrument).to.have.been.calledWith(sinon.match.same(finder));
        });
    });

    describe('pop()', function () {
        it('should revert to the previous call', function () {
            var firstCall = sinon.createStubInstance(Call),
                secondCall = sinon.createStubInstance(Call);
            this.callStack.push(firstCall);
            this.callStack.push(secondCall);

            this.callStack.pop();

            expect(this.callStack.getCurrent()).to.equal(firstCall);
        });
    });

    describe('push()', function () {
        it('should add the call to the top of the stack', function () {
            var call = sinon.createStubInstance(Call);
            this.callStack.push(call);

            expect(this.callStack.getCurrent()).to.equal(call);
        });
    });
});
