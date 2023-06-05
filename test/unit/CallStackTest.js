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
    tools = require('./tools'),
    Call = require('../../src/Call'),
    CallInstrumentation = require('../../src/Instrumentation/CallInstrumentation'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    ErrorReporting = require('../../src/Error/ErrorReporting'),
    Exception = phpCommon.Exception,
    Namespace = require('../../src/Namespace').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError,
    Scope = require('../../src/Scope').sync(),
    Trace = require('../../src/Control/Trace'),
    Translator = phpCommon.Translator,
    Value = require('../../src/Value').sync();

describe('CallStack', function () {
    var callStack,
        errorReporting,
        futureFactory,
        globalNamespace,
        state,
        translator,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        errorReporting = sinon.createStubInstance(ErrorReporting);
        futureFactory = state.getFutureFactory();
        globalNamespace = sinon.createStubInstance(Namespace);
        translator = sinon.createStubInstance(Translator);
        valueFactory = state.getValueFactory();

        valueFactory.setGlobalNamespace(globalNamespace);

        callStack = new CallStack(valueFactory, translator, errorReporting);
    });

    describe('clear()', function () {
        it('should delete all frames from the call stack', function () {
            callStack.push(sinon.createStubInstance(Call));
            callStack.push(sinon.createStubInstance(Call));
            callStack.push(sinon.createStubInstance(Call));

            callStack.clear();

            expect(callStack.getLength()).to.equal(0);
        });
    });

    describe('getCaller()', function () {
        it('should return the caller call when there is one', function () {
            var callerCall = sinon.createStubInstance(Call),
                currentCall = sinon.createStubInstance(Call);
            callStack.push(callerCall);
            callStack.push(currentCall);

            expect(callStack.getCaller()).to.equal(callerCall);
        });

        it('should return null when the current call is the top-level one', function () {
            var currentCall = sinon.createStubInstance(Call);
            callStack.push(currentCall);

            expect(callStack.getCaller()).to.be.null;
        });

        it('should return null when the call stack is empty', function () {
            expect(callStack.getCaller()).to.be.null;
        });
    });

    describe('getCallerFilePath()', function () {
        it('should return the file path from the most recent userland caller', function () {
            var initialCall = sinon.createStubInstance(Call),
                userlandCall1 = sinon.createStubInstance(Call),
                userlandCall2 = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            userlandCall1.isUserland.returns(true);
            userlandCall2.isUserland.returns(true);
            callStack.push(initialCall);
            callStack.push(userlandCall1);
            callStack.push(userlandCall2);
            userlandCall1.getFilePath.returns('/my/caller/module.php');

            expect(callStack.getCallerFilePath()).to.equal('/my/caller/module.php');
        });
    });

    describe('getCallerLastLine()', function () {
        it('should return the line number inside the most recent userland caller', function () {
            var initialCall = sinon.createStubInstance(Call),
                userlandCall1 = sinon.createStubInstance(Call),
                userlandCall2 = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            userlandCall1.isUserland.returns(true);
            userlandCall2.isUserland.returns(true);
            callStack.push(initialCall);
            callStack.push(userlandCall1);
            callStack.push(userlandCall2);
            userlandCall1.getLastLine.returns(21);

            expect(callStack.getCallerLastLine()).to.equal(21);
        });
    });

    describe('getCallerScope()', function () {
        it('should return the scope of the caller call when there is one', function () {
            var callerCall = sinon.createStubInstance(Call),
                callerScope = sinon.createStubInstance(Scope),
                currentCall = sinon.createStubInstance(Call);
            callerCall.getScope.returns(callerScope);
            callStack.push(callerCall);
            callStack.push(currentCall);

            expect(callStack.getCallerScope()).to.equal(callerScope);
        });

        it('should return null when the current call is the top-level one', function () {
            var currentCall = sinon.createStubInstance(Call);
            callStack.push(currentCall);

            expect(callStack.getCallerScope()).to.be.null;
        });

        it('should return null when the call stack is empty', function () {
            expect(callStack.getCallerScope()).to.be.null;
        });
    });

    describe('getCurrent()', function () {
        it('should return the current Call when there are 3 on the stack', function () {
            var currentCall = sinon.createStubInstance(Call);
            callStack.push(sinon.createStubInstance(Call));
            callStack.push(sinon.createStubInstance(Call));
            callStack.push(currentCall);

            expect(callStack.getCurrent()).to.equal(currentCall);
        });
    });

    describe('getCurrentClass()', function () {
        it('should return the current class for the current Call when there are 3 on the stack', function () {
            var currentCall = sinon.createStubInstance(Call),
                currentClass = sinon.createStubInstance(Class);
            currentCall.getCurrentClass.returns(currentClass);
            callStack.push(sinon.createStubInstance(Call));
            callStack.push(sinon.createStubInstance(Call));
            callStack.push(currentCall);

            expect(callStack.getCurrentClass()).to.equal(currentClass);
        });

        it('should return null when there is no call on the stack', function () {
            expect(callStack.getCurrentClass()).to.equal(null);
        });
    });

    describe('getCurrentInstrumentation()', function () {
        it('should return the instrumentation for the current Call', function () {
            var currentCall = sinon.createStubInstance(Call),
                instrumentation = sinon.createStubInstance(CallInstrumentation);
            currentCall.getInstrumentation.returns(instrumentation);
            callStack.push(currentCall);

            expect(callStack.getCurrentInstrumentation()).to.equal(instrumentation);
        });

        it('should throw when the call stack is empty', function () {
            expect(function () {
                callStack.getCurrentInstrumentation();
            }).to.throw(
                Exception,
                'CallStack.getCurrentInstrumentation() :: No current call'
            );
        });
    });

    describe('getCurrentScope()', function () {
        it('should return the current Scope for the current Call when there are 3 on the stack', function () {
            var currentCall = sinon.createStubInstance(Call),
                currentScope = sinon.createStubInstance(Scope);
            currentCall.getScope.returns(currentScope);
            callStack.push(sinon.createStubInstance(Call));
            callStack.push(sinon.createStubInstance(Call));
            callStack.push(currentCall);

            expect(callStack.getCurrentScope()).to.equal(currentScope);
        });

        it('should return null when there is no call on the stack', function () {
            expect(callStack.getCurrentScope()).to.equal(null);
        });
    });

    describe('getCurrentTrace()', function () {
        it('should return the Trace for the current Call', function () {
            var currentCall = sinon.createStubInstance(Call),
                trace = sinon.createStubInstance(Trace);
            currentCall.getTrace.returns(trace);
            callStack.push(currentCall);

            expect(callStack.getCurrentTrace()).to.equal(trace);
        });

        it('should throw when the call stack is empty', function () {
            expect(function () {
                callStack.getCurrentTrace();
            }).to.throw(
                Exception,
                'CallStack.getCurrentTrace() :: No current call'
            );
        });
    });

    describe('getEffectiveNamespaceScope()', function () {
        it('should return the effective NamespaceScope for the current Call', function () {
            var currentCall = sinon.createStubInstance(Call),
                namespaceScope = sinon.createStubInstance(NamespaceScope);
            currentCall.getEffectiveNamespaceScope.returns(namespaceScope);
            callStack.push(currentCall);

            expect(callStack.getEffectiveNamespaceScope()).to.equal(namespaceScope);
        });

        it('should throw when the call stack is empty', function () {
            expect(function () {
                callStack.getEffectiveNamespaceScope();
            }).to.throw(
                Exception,
                'CallStack.getEffectiveNamespaceScope() :: No current call'
            );
        });
    });

    describe('getGenerator()', function () {
        var currentCall;

        beforeEach(function () {
            currentCall = sinon.createStubInstance(Call);
            currentCall.isUserland.returns(false);
        });

        it('should return the current Generator ObjectValue from the current call', function () {
            var generatorObjectValue = sinon.createStubInstance(ObjectValue);
            callStack.push(currentCall);
            currentCall.getGenerator.returns(generatorObjectValue);

            expect(callStack.getGenerator()).to.equal(generatorObjectValue);
        });

        it('should throw when there is no userland callee', function () {
            expect(function () {
                callStack.getGenerator();
            }).to.throw(
                Exception,
                'CallStack.getGenerator() :: No userland callee'
            );
        });
    });

    describe('getLastFilePath()', function () {
        it('should return the file path from the most recent userland Call', function () {
            var initialCall = sinon.createStubInstance(Call),
                userlandCall = sinon.createStubInstance(Call),
                builtinCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            userlandCall.isUserland.returns(true);
            builtinCall.isUserland.returns(false);
            callStack.push(initialCall);
            callStack.push(userlandCall);
            callStack.push(builtinCall);
            userlandCall.getFilePath.returns('/my/current/module.php');

            expect(callStack.getLastFilePath()).to.equal('/my/current/module.php');
        });
    });

    describe('getLastLine()', function () {
        it('should return the line number inside the currently called function', function () {
            var initialCall = sinon.createStubInstance(Call),
                userlandCall = sinon.createStubInstance(Call),
                builtinCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            userlandCall.isUserland.returns(true);
            builtinCall.isUserland.returns(false);
            callStack.push(initialCall);
            callStack.push(userlandCall);
            callStack.push(builtinCall);
            userlandCall.getLastLine.returns(27);

            expect(callStack.getLastLine()).to.equal(27);
        });
    });

    describe('getLength()', function () {
        it('should return the number of calls on the stack', function () {
            var callerCall = sinon.createStubInstance(Call),
                currentCall = sinon.createStubInstance(Call);
            callStack.push(callerCall);
            callStack.push(currentCall);

            expect(callStack.getLength()).to.equal(2);
        });
    });

    describe('getStaticClass()', function () {
        it('should return the static class for the current call, if it has one specified', function () {
            var callerCall = sinon.createStubInstance(Call),
                currentCall = sinon.createStubInstance(Call),
                currentStaticClass = sinon.createStubInstance(Class);
            currentCall.getStaticClass.returns(currentStaticClass);
            callStack.push(callerCall);
            callStack.push(currentCall);

            expect(callStack.getStaticClass()).to.equal(currentStaticClass);
        });

        it('should return the static class for the caller, if it has one specified', function () {
            var callerCall = sinon.createStubInstance(Call),
                callerStaticClass = sinon.createStubInstance(Class),
                currentCall = sinon.createStubInstance(Call);
            currentCall.getStaticClass.returns(null);
            callerCall.getStaticClass.returns(callerStaticClass);
            callStack.push(callerCall);
            callStack.push(currentCall);

            expect(callStack.getStaticClass()).to.equal(callerStaticClass);
        });

        it('should return null when the call stack is empty', function () {
            expect(callStack.getStaticClass()).to.be.null;
        });
    });

    describe('getThisObject()', function () {
        it('should return the `$this` object from the scope of the current Call', function () {
            var currentCall = sinon.createStubInstance(Call),
                thisObjectValue = sinon.createStubInstance(ObjectValue);
            callStack.push(sinon.createStubInstance(Call));
            callStack.push(currentCall);
            currentCall.getThisObject.returns(thisObjectValue);

            expect(callStack.getThisObject()).to.equal(thisObjectValue);
        });

        it('should return null when the call stack is empty', function () {
            expect(callStack.getThisObject()).to.be.null;
        });
    });

    describe('getTrace()', function () {
        it('should return an empty array when there are no calls on the stack', function () {
            expect(callStack.getTrace()).to.deep.equal([]);
        });

        describe('with three userland calls', function () {
            var entryCall,
                firstCall,
                firstCallArgs,
                secondCall,
                secondCallArgs,
                thirdCall,
                thirdCallArgs;

            beforeEach(function () {
                entryCall = sinon.createStubInstance(Call);
                entryCall.getTraceFilePath.returns('(Entry file)');
                entryCall.getLastLine.returns(4);
                firstCall = sinon.createStubInstance(Call);
                firstCall.getTraceFilePath.returns('/path/to/oldest/call.php');
                firstCallArgs = [sinon.createStubInstance(Value)];
                firstCall.getFunctionArgs.returns(firstCallArgs);
                firstCall.getFunctionName.returns('myOldestCalledFunc');
                firstCall.getLastLine.returns(100);
                secondCall = sinon.createStubInstance(Call);
                secondCall.getTraceFilePath.returns('/path/to/second/call.php');
                secondCallArgs = [sinon.createStubInstance(Value)];
                secondCall.getFunctionArgs.returns(secondCallArgs);
                secondCall.getFunctionName.returns('mySecondCalledFunc');
                secondCall.getLastLine.returns(21);
                thirdCall = sinon.createStubInstance(Call);
                thirdCall.getTraceFilePath.returns('/path/to/newest/call.php');
                thirdCallArgs = [sinon.createStubInstance(Value)];
                thirdCall.getFunctionArgs.returns(thirdCallArgs);
                thirdCall.getFunctionName.returns('myMostRecentlyCalledFunc');
                thirdCall.getLastLine.returns(27);
                callStack.push(entryCall); // Entry call gets ignored
                callStack.push(firstCall);
                callStack.push(secondCall);
                callStack.push(thirdCall);
            });

            it('should return a trace with three entries', function () {
                expect(callStack.getTrace()).to.have.length(3);
            });

            it('should give each entry the correct index, with index 0 as the most recent call', function () {
                var trace = callStack.getTrace();

                expect(trace[0].index).to.equal(0);
                expect(trace[1].index).to.equal(1);
                expect(trace[2].index).to.equal(2);
            });

            it('should give each entry the correct file path', function () {
                var trace = callStack.getTrace();

                expect(trace[0].file).to.equal('/path/to/second/call.php');
                expect(trace[1].file).to.equal('/path/to/oldest/call.php');
                expect(trace[2].file).to.equal('(Entry file)');
            });

            it('should give each entry the correct line (from the previous call)', function () {
                var trace = callStack.getTrace();

                // We return the previous call's line number, as that is the line
                // the call was made from in the calling file
                expect(trace[0].line).to.equal(21);
                expect(trace[1].line).to.equal(100);
                expect(trace[2].line).to.equal(4);
            });

            it('should give each entry the correct function name', function () {
                var trace = callStack.getTrace();

                expect(trace[0].func).to.equal('myMostRecentlyCalledFunc');
                expect(trace[1].func).to.equal('mySecondCalledFunc');
                expect(trace[2].func).to.equal('myOldestCalledFunc');
            });

            it('should give each entry the correct function args', function () {
                var trace = callStack.getTrace();

                expect(trace[0].args).to.equal(thirdCallArgs);
                expect(trace[1].args).to.equal(secondCallArgs);
                expect(trace[2].args).to.equal(firstCallArgs);
            });

            describe('when skipCurrentStackFrame=true', function () {
                it('should return a trace with two entries', function () {
                    var trace = callStack.getTrace(true);

                    expect(trace).to.have.length(2);
                    expect(trace[0].index).to.equal(0);
                    expect(trace[0].func).to.equal('mySecondCalledFunc');
                    expect(trace[1].index).to.equal(1);
                    expect(trace[1].func).to.equal('myOldestCalledFunc');
                });
            });
        });

        describe('with two native calls followed by a userland one', function () {
            var entryCall,
                firstCall,
                firstCallArgs,
                secondCall,
                secondCallArgs,
                thirdCall,
                thirdCallArgs;

            beforeEach(function () {
                entryCall = sinon.createStubInstance(Call);
                entryCall.getTraceFilePath.returns('(Entry file)');
                entryCall.getLastLine.returns(4);
                entryCall.isUserland.returns(true);
                firstCall = sinon.createStubInstance(Call);
                firstCall.getTraceFilePath.returns(null);
                firstCallArgs = [sinon.createStubInstance(Value)];
                firstCall.getFunctionArgs.returns(firstCallArgs);
                firstCall.getFunctionName.returns('myOldestCalledFunc');
                firstCall.getLastLine.returns(null);
                firstCall.isUserland.returns(false);
                secondCall = sinon.createStubInstance(Call);
                secondCall.getTraceFilePath.returns(null);
                secondCallArgs = [sinon.createStubInstance(Value)];
                secondCall.getFunctionArgs.returns(secondCallArgs);
                secondCall.getFunctionName.returns('mySecondCalledFunc');
                secondCall.getLastLine.returns(null);
                secondCall.isUserland.returns(false);
                thirdCall = sinon.createStubInstance(Call);
                thirdCall.getTraceFilePath.returns('/path/to/newest/call.php');
                thirdCallArgs = [sinon.createStubInstance(Value)];
                thirdCall.getFunctionArgs.returns(thirdCallArgs);
                thirdCall.getFunctionName.returns('myMostRecentlyCalledFunc');
                thirdCall.getLastLine.returns(27);
                thirdCall.isUserland.returns(false);
                callStack.push(entryCall); // Entry call gets ignored
                callStack.push(firstCall);
                callStack.push(secondCall);
                callStack.push(thirdCall);
            });

            it('should return a trace with three entries', function () {
                expect(callStack.getTrace()).to.have.length(3);
            });

            it('should give each entry the correct file path', function () {
                var trace = callStack.getTrace();

                // Note that the unknown (null) file paths are populated
                // with the path of the nearest ancestor instead.
                expect(trace[0].file).to.equal('(Entry file)');
                expect(trace[1].file).to.equal('(Entry file)');
                expect(trace[2].file).to.equal('(Entry file)');
            });

            it('should give each entry the correct line (from the previous call)', function () {
                var trace = callStack.getTrace();

                // We return the previous call's line number, as that is the line
                // the call was made from in the calling file
                expect(trace[0].line).to.equal(4);
                expect(trace[1].line).to.equal(4);
                expect(trace[2].line).to.equal(4);
            });
        });

        describe('with a userland call that has a path but no line number', function () {
            var entryCall,
                firstCall,
                firstCallArgs,
                secondCall,
                secondCallArgs,
                thirdCall,
                thirdCallArgs;

            beforeEach(function () {
                entryCall = sinon.createStubInstance(Call);
                entryCall.getTraceFilePath.returns('(Entry file)');
                entryCall.getLastLine.returns(4);
                entryCall.isUserland.returns(true);
                firstCall = sinon.createStubInstance(Call);
                firstCall.getTraceFilePath.returns('/path/to/oldest/call.php');
                firstCallArgs = [sinon.createStubInstance(Value)];
                firstCall.getFunctionArgs.returns(firstCallArgs);
                firstCall.getFunctionName.returns('myOldestCalledFunc');
                firstCall.getLastLine.returns(null);
                firstCall.isUserland.returns(false);
                secondCall = sinon.createStubInstance(Call);
                secondCall.getTraceFilePath.returns('/path/to/second/call.php');
                secondCallArgs = [sinon.createStubInstance(Value)];
                secondCall.getFunctionArgs.returns(secondCallArgs);
                secondCall.getFunctionName.returns('mySecondCalledFunc');
                secondCall.getLastLine.returns(null);
                secondCall.isUserland.returns(false);
                thirdCall = sinon.createStubInstance(Call);
                thirdCall.getTraceFilePath.returns('/path/to/newest/call.php');
                thirdCallArgs = [sinon.createStubInstance(Value)];
                thirdCall.getFunctionArgs.returns(thirdCallArgs);
                thirdCall.getFunctionName.returns('myMostRecentlyCalledFunc');
                thirdCall.getLastLine.returns(27);
                thirdCall.isUserland.returns(false);
                callStack.push(entryCall); // Entry call gets ignored
                callStack.push(firstCall);
                callStack.push(secondCall);
                callStack.push(thirdCall);
            });

            it('should return a trace with three entries', function () {
                expect(callStack.getTrace()).to.have.length(3);
            });

            it('should give each entry the correct file path', function () {
                var trace = callStack.getTrace();

                expect(trace[0].file).to.equal('/path/to/second/call.php');
                expect(trace[1].file).to.equal('/path/to/oldest/call.php');
                expect(trace[2].file).to.equal('(Entry file)');
            });

            it('should give each entry the correct line (from the previous call)', function () {
                var trace = callStack.getTrace();

                // We return the previous call's line number, as that is the line
                // the call was made from in the calling file.
                // However these should be left null as there is a path given,
                // therefore fetching a line number from an ancestor call may be invalid.
                expect(trace[0].line).to.be.null;
                expect(trace[1].line).to.be.null;
                expect(trace[2].line).to.equal(4);
            });
        });
    });

    describe('getUserlandCallee()', function () {
        it('should return null when the call stack is empty', function () {
            expect(callStack.getUserlandCallee()).to.be.null;
        });

        it('should return the first call when none on the stack are userland', function () {
            var initialCall = sinon.createStubInstance(Call),
                intermediateCall = sinon.createStubInstance(Call),
                builtinCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            intermediateCall.isUserland.returns(false);
            builtinCall.isUserland.returns(false);
            callStack.push(initialCall);
            callStack.push(intermediateCall);
            callStack.push(builtinCall);

            expect(callStack.getUserlandCallee()).to.equal(initialCall);
        });

        it('should return the most recent userland call when callee is not userland', function () {
            var initialCall = sinon.createStubInstance(Call),
                userlandCall1 = sinon.createStubInstance(Call),
                userlandCall2 = sinon.createStubInstance(Call),
                builtinCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            userlandCall1.isUserland.returns(true);
            userlandCall2.isUserland.returns(true);
            builtinCall.isUserland.returns(false);
            callStack.push(initialCall);
            callStack.push(userlandCall1);
            callStack.push(userlandCall2);
            callStack.push(builtinCall);

            expect(callStack.getUserlandCallee()).to.equal(userlandCall2);
        });

        it('should return the userland callee when callee is userland', function () {
            var initialCall = sinon.createStubInstance(Call),
                userlandCall1 = sinon.createStubInstance(Call),
                userlandCall2 = sinon.createStubInstance(Call),
                userlandCall3 = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            userlandCall1.isUserland.returns(true);  // Caller of caller is userland
            userlandCall2.isUserland.returns(false); // Caller is not userland
            userlandCall3.isUserland.returns(true);  // Most recent call is userland
            callStack.push(initialCall);
            callStack.push(userlandCall1);
            callStack.push(userlandCall2);
            callStack.push(userlandCall3);

            expect(callStack.getUserlandCallee()).to.equal(userlandCall3);
        });
    });

    describe('getUserlandCaller()', function () {
        it('should return null when the call stack is empty', function () {
            expect(callStack.getUserlandCaller()).to.be.null;
        });

        it('should return the first call when none on the stack are userland', function () {
            var initialCall = sinon.createStubInstance(Call),
                intermediateCall = sinon.createStubInstance(Call),
                builtinCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            intermediateCall.isUserland.returns(false);
            builtinCall.isUserland.returns(false);
            callStack.push(initialCall);
            callStack.push(intermediateCall);
            callStack.push(builtinCall);

            expect(callStack.getUserlandCaller()).to.equal(initialCall);
        });

        it('should return the most recent userland call when callee is not userland', function () {
            var initialCall = sinon.createStubInstance(Call),
                userlandCall1 = sinon.createStubInstance(Call),
                userlandCall2 = sinon.createStubInstance(Call),
                builtinCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            userlandCall1.isUserland.returns(true);
            userlandCall2.isUserland.returns(true);
            builtinCall.isUserland.returns(false);
            callStack.push(initialCall);
            callStack.push(userlandCall1);
            callStack.push(userlandCall2);
            callStack.push(builtinCall);

            expect(callStack.getUserlandCaller()).to.equal(userlandCall2);
        });

        it('should return the userland caller when callee is userland', function () {
            var initialCall = sinon.createStubInstance(Call),
                userlandCall1 = sinon.createStubInstance(Call),
                userlandCall2 = sinon.createStubInstance(Call),
                userlandCall3 = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            userlandCall1.isUserland.returns(true);  // Caller of caller is userland
            userlandCall2.isUserland.returns(false); // Caller is not userland
            userlandCall3.isUserland.returns(true);  // Most recent call is userland
            callStack.push(initialCall);
            callStack.push(userlandCall1);
            callStack.push(userlandCall2);
            callStack.push(userlandCall3);

            expect(callStack.getUserlandCaller()).to.equal(userlandCall1);
        });
    });

    describe('instrumentCurrent()', function () {
        it('should instrument the current call with the provided finder', function () {
            var currentCall = sinon.createStubInstance(Call),
                finder = sinon.stub();
            callStack.push(currentCall);

            callStack.instrumentCurrent(finder);

            expect(currentCall.instrument).to.have.been.calledOnce;
            expect(currentCall.instrument).to.have.been.calledWith(sinon.match.same(finder));
        });
    });

    describe('isUserland()', function () {
        it('should return true when the current call is userland', function () {
            var initialCall = sinon.createStubInstance(Call),
                intermediateCall = sinon.createStubInstance(Call),
                userlandCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            intermediateCall.isUserland.returns(false);
            userlandCall.isUserland.returns(true);
            callStack.push(initialCall);
            callStack.push(intermediateCall);
            callStack.push(userlandCall);

            expect(callStack.isUserland()).to.be.true;
        });

        it('should return false when none on the stack are userland', function () {
            var initialCall = sinon.createStubInstance(Call),
                intermediateCall = sinon.createStubInstance(Call),
                builtinCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            intermediateCall.isUserland.returns(false);
            builtinCall.isUserland.returns(false);
            callStack.push(initialCall);
            callStack.push(intermediateCall);
            callStack.push(builtinCall);

            expect(callStack.isUserland()).to.be.false;
        });

        it('should return false when only the caller was userland', function () {
            var initialCall = sinon.createStubInstance(Call),
                intermediateCall = sinon.createStubInstance(Call),
                builtinCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            intermediateCall.isUserland.returns(true);
            builtinCall.isUserland.returns(false);
            callStack.push(initialCall);
            callStack.push(intermediateCall);
            callStack.push(builtinCall);

            expect(callStack.isUserland()).to.be.false;
        });
    });

    describe('pop()', function () {
        it('should revert to the previous call', function () {
            var firstCall = sinon.createStubInstance(Call),
                secondCall = sinon.createStubInstance(Call);
            callStack.push(firstCall);
            callStack.push(secondCall);

            callStack.pop();

            expect(callStack.getCurrent()).to.equal(firstCall);
        });
    });

    describe('push()', function () {
        it('should add the call to the top of the stack', function () {
            var call = sinon.createStubInstance(Call);
            callStack.push(call);

            expect(callStack.getCurrent()).to.equal(call);
        });
    });

    describe('raiseError()', function () {
        var whenThereAreCallsOnTheStack;

        beforeEach(function () {
            whenThereAreCallsOnTheStack = function () {
                var initialCall = sinon.createStubInstance(Call),
                    userlandCall = sinon.createStubInstance(Call),
                    builtinCall = sinon.createStubInstance(Call);
                initialCall.isUserland.returns(false);
                userlandCall.isUserland.returns(true);
                builtinCall.isUserland.returns(false);

                initialCall.getFilePath.returns('/my/initial/module.php');
                initialCall.getTraceFilePath.returns('/my/initial/module.php');
                initialCall.getFunctionArgs.returns([]);
                initialCall.getFunctionName.returns('');
                initialCall.getLastLine.returns(27);

                userlandCall.getFilePath.returns('/my/userland/module.php');
                userlandCall.getTraceFilePath.returns('/my/userland/module.php');
                userlandCall.getFunctionArgs.returns([]);
                userlandCall.getFunctionName.returns('myFunction');
                userlandCall.getLastLine.returns(101);

                builtinCall.getFilePath.returns(null);
                builtinCall.getTraceFilePath.returns(null);
                builtinCall.getFunctionArgs.returns([]);
                builtinCall.getFunctionName.returns('some_builtin');
                builtinCall.getLastLine.returns(null);

                callStack.push(initialCall);
                callStack.push(userlandCall);
                callStack.push(builtinCall);
            };
        });

        describe('for a non-fatal error when there are calls on the stack', function () {
            beforeEach(function () {
                whenThereAreCallsOnTheStack();
            });

            it('should report the error via ErrorReporting when no errors are suppressed', function () {
                callStack.raiseError(PHPError.E_WARNING, 'This may or may not be bad.', null, true);

                expect(errorReporting.reportError).to.have.been.calledOnce;
                expect(errorReporting.reportError).to.have.been.calledWith(
                    PHPError.E_WARNING,
                    'This may or may not be bad.',
                    '/my/userland/module.php',
                    101,
                    [
                        {
                            args: [],
                            file: '/my/userland/module.php',
                            func: 'some_builtin',
                            index: 0,
                            line: 101
                        },
                        {
                            args: [],
                            file: '/my/initial/module.php',
                            func: 'myFunction',
                            index: 1,
                            line: 27
                        }
                    ],
                    true
                );
            });
        });

        describe('for a non-fatal error when there are no calls on the stack', function () {
            it('should report the error via ErrorReporting when no errors are suppressed', function () {
                callStack.raiseError(PHPError.E_WARNING, 'This may or may not be bad.', null, true);

                expect(errorReporting.reportError).to.have.been.calledOnce;
                expect(errorReporting.reportError).to.have.been.calledWith(
                    PHPError.E_WARNING,
                    'This may or may not be bad.',
                    null,
                    null,
                    [],
                    true
                );
            });
        });

        describe('for a fatal error when there are calls on the stack', function () {
            beforeEach(function () {
                whenThereAreCallsOnTheStack();
            });

            it('should not invoke ErrorReporting', function () {
                try {
                    callStack.raiseError(PHPError.E_ERROR, 'Oh dear...!');
                } catch (error) {}

                expect(errorReporting.reportError).not.to.have.been.called;
            });

            it('should throw a PHPFatalError with the correct message and context', function () {
                expect(function () {
                    callStack.raiseError(PHPError.E_ERROR, 'Oh dear...!');
                }).to.throw(
                    PHPFatalError,
                    // Context should be the userland caller when the current function is a builtin
                    'PHP Fatal error: Oh dear...! in /my/userland/module.php on line 101'
                );
            });
        });

        describe('for a fatal error when there are no calls on the stack', function () {
            it('should not invoke ErrorReporting', function () {
                try {
                    callStack.raiseError(PHPError.E_ERROR, 'Oh dear...!');
                } catch (error) {}

                expect(errorReporting.reportError).not.to.have.been.called;
            });

            it('should throw a PHPFatalError with the correct message and context', function () {
                expect(function () {
                    callStack.raiseError(PHPError.E_ERROR, 'Oh dear...!');
                }).to.throw(
                    PHPFatalError,
                    // Context should be the userland caller when the current function is a builtin
                    'PHP Fatal error: Oh dear...! in (unknown) on line (unknown)'
                );
            });
        });
    });

    describe('raiseTranslatedError()', function () {
        beforeEach(function () {
            // Make sure we have at least one call on the stack
            // for things like checking for error suppression.
            callStack.push(sinon.createStubInstance(Call));

            translator.translate
                .withArgs('my_translation_key', {
                    my_placeholder: 'My value'
                })
                .returns('My translated message');
            translator.translate
                .withArgs('my_context_translation_key', {
                    my_context_placeholder: 'Contextual value'
                })
                .returns('My translated contextual message');
        });

        it('should throw an ObjectValue wrapping an instance of Error when the E_ERROR level is given but no context', async function () {
            var caughtError = null,
                errorClassObject = sinon.createStubInstance(Class),
                errorValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass
                .withArgs('MySubError')
                .returns(futureFactory.createPresent(errorClassObject));
            errorClassObject.instantiate
                .withArgs(
                    // Constructor arguments.
                    [
                        sinon.match(function (arg) {
                            return arg.getNative() === 'My translated message';
                        }),
                        sinon.match(function (arg) {
                            return arg.getNative() === 0;
                        }),
                        sinon.match(function (arg) {
                            return arg.getNative() === null;
                        })
                    ],
                    // Shadow constructor arguments.
                    [
                        '', // No context given.
                        false // Not skipping the current stack frame.
                    ]
                )
                .returns(errorValue);

            try {
                callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    'my_translation_key',
                    {
                        my_placeholder: 'My value'
                    },
                    'MySubError',
                    false,
                    '/my/custom/file_path.php',
                    4321
                );
            } catch (error) {
                caughtError = await error.toPromise(); // Error will be a FutureValue.
            }

            expect(caughtError).to.equal(errorValue);
            expect(errorValue.setProperty).to.have.been.calledTwice;
            expect(errorValue.setProperty).to.have.been.calledWith('file', sinon.match(function (arg) {
                return arg.getNative() === '/my/custom/file_path.php';
            }));
            expect(errorValue.setProperty).to.have.been.calledWith('line', sinon.match(function (arg) {
                return arg.getNative() === 4321;
            }));
        });

        it('should throw an ObjectValue wrapping an instance of Error when the E_ERROR level is given with context', async function () {
            var caughtError = null,
                errorClassObject = sinon.createStubInstance(Class),
                errorValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass
                .withArgs('MySubError')
                .returns(futureFactory.createPresent(errorClassObject));
            errorClassObject.instantiate
                .withArgs(
                    // Constructor arguments.
                    [
                        sinon.match(function (arg) {
                            return arg.getNative() === 'My translated message';
                        }),
                        sinon.match(function (arg) {
                            return arg.getNative() === 0;
                        }),
                        sinon.match(function (arg) {
                            return arg.getNative() === null;
                        })
                    ],
                    // Shadow constructor arguments.
                    [
                        'My translated contextual message', // Context given.
                        true // Skip the current stack frame.
                    ]
                )
                .returns(errorValue);

            try {
                callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    'my_translation_key',
                    {
                        my_placeholder: 'My value'
                    },
                    'MySubError',
                    false,
                    '/my/custom/file_path.php',
                    4321,
                    'my_context_translation_key',
                    {
                        my_context_placeholder: 'Contextual value'
                    },
                    true // Skip the current stack frame.
                );
            } catch (error) {
                caughtError = await error.toPromise(); // Error will be a FutureValue.
            }

            expect(caughtError).to.equal(errorValue);
            expect(errorValue.setProperty).to.have.been.calledTwice;
            expect(errorValue.setProperty).to.have.been.calledWith('file', sinon.match(function (arg) {
                return arg.getNative() === '/my/custom/file_path.php';
            }));
            expect(errorValue.setProperty).to.have.been.calledWith('line', sinon.match(function (arg) {
                return arg.getNative() === 4321;
            }));
        });

        it('should raise an error via ErrorReporting when the E_WARNING level is given', function () {
            callStack.raiseTranslatedError(
                PHPError.E_WARNING,
                'my_translation_key',
                {
                    my_placeholder: 'My value'
                },
                'MySubError',
                false
            );

            expect(errorReporting.reportError).to.have.been.calledOnce;
            expect(errorReporting.reportError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'My translated message'
            );
        });
    });

    describe('raiseUncatchableFatalError()', function () {
        beforeEach(function () {
            var initialCall = sinon.createStubInstance(Call),
                userlandCall = sinon.createStubInstance(Call),
                builtinCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            userlandCall.isUserland.returns(true);
            builtinCall.isUserland.returns(false);

            initialCall.getFilePath.returns('/my/initial/module.php');
            initialCall.getFunctionArgs.returns([]);
            initialCall.getFunctionName.returns('');
            initialCall.getLastLine.returns(27);

            userlandCall.getFilePath.returns('/my/userland/module.php');
            userlandCall.getFunctionArgs.returns([]);
            userlandCall.getFunctionName.returns('myFunction');
            userlandCall.getLastLine.returns(101);

            builtinCall.getFilePath.returns(null);
            builtinCall.getFunctionArgs.returns([]);
            builtinCall.getFunctionName.returns('some_builtin');
            builtinCall.getLastLine.returns(null);

            callStack.push(initialCall);
            callStack.push(userlandCall);
            callStack.push(builtinCall);

            translator.translate
                .withArgs('my_translation_key', {
                    my_placeholder: 'My value'
                })
                .returns('My translated error message!');
        });

        it('should throw a PHPFatalError with the correct message and context', function () {
            expect(function () {
                callStack.raiseUncatchableFatalError('my_translation_key', {
                    my_placeholder: 'My value'
                });
            }).to.throw(
                PHPFatalError,
                // Context should be the userland caller when the current function is a builtin
                'PHP Fatal error: My translated error message! in /my/userland/module.php on line 101'
            );
        });
    });

    describe('restore()', function () {
        it('should add the given calls to an empty CallStack', function () {
            var callerCall = sinon.createStubInstance(Call),
                currentCall = sinon.createStubInstance(Call);

            callStack.restore([callerCall, currentCall]);

            expect(callStack.getLength()).to.equal(2);
            expect(callStack.getCurrent()).to.equal(currentCall);
            expect(callStack.getCaller()).to.equal(callerCall);
        });

        it('should clear the CallStack before adding the given calls', function () {
            var previousCallerCall = sinon.createStubInstance(Call),
                previousCurrentCall = sinon.createStubInstance(Call),
                newCallerCall = sinon.createStubInstance(Call),
                newCurrentCall = sinon.createStubInstance(Call);
            callStack.push(previousCallerCall);
            callStack.push(previousCurrentCall);

            callStack.restore([newCallerCall, newCurrentCall]);

            expect(callStack.getLength()).to.equal(2);
            expect(callStack.getCurrent()).to.equal(newCurrentCall);
            expect(callStack.getCaller()).to.equal(newCallerCall);
        });

        it('should be able to restore an empty set of frames', function () {
            var previousCallerCall = sinon.createStubInstance(Call),
                previousCurrentCall = sinon.createStubInstance(Call);
            callStack.push(previousCallerCall);
            callStack.push(previousCurrentCall);

            callStack.restore([]);

            expect(callStack.getLength()).to.equal(0);
        });
    });

    describe('resume()', function () {
        it('should resume the most recent userland callee on the stack', function () {
            var firstUserlandCallee = sinon.createStubInstance(Call),
                secondUserlandCallee = sinon.createStubInstance(Call),
                builtinCallee = sinon.createStubInstance(Call);
            firstUserlandCallee.isUserland.returns(true);
            secondUserlandCallee.isUserland.returns(true);
            builtinCallee.isUserland.returns(false);
            callStack.push(firstUserlandCallee);
            callStack.push(secondUserlandCallee);
            callStack.push(builtinCallee);

            callStack.resume(21);

            expect(secondUserlandCallee.resume).to.have.been.calledOnce;
            expect(secondUserlandCallee.resume).to.have.been.calledWith(21);
        });

        it('should throw when the call stack is empty', function () {
            expect(function () {
                callStack.resume(21);
            }).to.throw(
                Exception,
                'CallStack.resume() :: Cannot resume when there is no userland callee'
            );
        });
    });

    describe('save()', function () {
        it('should return the frames', function () {
            var callerCall = sinon.createStubInstance(Call),
                currentCall = sinon.createStubInstance(Call),
                result;
            callStack.push(callerCall);
            callStack.push(currentCall);

            result = callStack.save();

            expect(result).to.have.length(2);
            expect(result[0]).to.equal(callerCall);
            expect(result[1]).to.equal(currentCall);
        });

        it('should not clear the frames', function () {
            var callerCall = sinon.createStubInstance(Call),
                currentCall = sinon.createStubInstance(Call);
            callStack.push(callerCall);
            callStack.push(currentCall);

            callStack.save();

            expect(callStack.getLength()).to.equal(2);
            expect(callStack.getCurrent()).to.equal(currentCall);
            expect(callStack.getCaller()).to.equal(callerCall);
        });
    });

    describe('throwInto()', function () {
        it('should resume the most recent userland callee on the stack', function () {
            var error = new Error('Bang!'),
                firstUserlandCallee = sinon.createStubInstance(Call),
                secondUserlandCallee = sinon.createStubInstance(Call),
                builtinCallee = sinon.createStubInstance(Call);
            firstUserlandCallee.isUserland.returns(true);
            secondUserlandCallee.isUserland.returns(true);
            builtinCallee.isUserland.returns(false);
            callStack.push(firstUserlandCallee);
            callStack.push(secondUserlandCallee);
            callStack.push(builtinCallee);

            callStack.throwInto(error);

            expect(secondUserlandCallee.throwInto).to.have.been.calledOnce;
            expect(secondUserlandCallee.throwInto).to.have.been.calledWith(sinon.match.same(error));
        });

        it('should throw when the call stack is empty', function () {
            expect(function () {
                callStack.throwInto(new Error('Bang!'));
            }).to.throw(
                Exception,
                'CallStack.throwInto() :: Cannot throw-resume when there is no userland callee'
            );
        });
    });

    describe('useDescendantNamespaceScope()', function () {
        it('should ask the current call to use the descendant NamespaceScope', function () {
            var call = sinon.createStubInstance(Call),
                namespaceScope = sinon.createStubInstance(NamespaceScope);
            call.useDescendantNamespaceScope
                .withArgs('MyDescendant')
                .returns(namespaceScope);
            callStack.push(call);

            expect(callStack.useDescendantNamespaceScope('MyDescendant')).to.equal(namespaceScope);
        });

        it('should throw when the call stack is empty', function () {
            expect(function () {
                callStack.useDescendantNamespaceScope('SomeDescendant');
            }).to.throw(
                Exception,
                'CallStack.useDescendantNamespaceScope() :: No current call'
            );
        });
    });

    describe('useGlobalNamespaceScope()', function () {
        it('should ask the current call to use the descendant NamespaceScope', function () {
            var call = sinon.createStubInstance(Call),
                namespaceScope = sinon.createStubInstance(NamespaceScope);
            call.useGlobalNamespaceScope.returns(namespaceScope);
            callStack.push(call);

            expect(callStack.useGlobalNamespaceScope()).to.equal(namespaceScope);
        });

        it('should throw when the call stack is empty', function () {
            expect(function () {
                callStack.useGlobalNamespaceScope();
            }).to.throw(
                Exception,
                'CallStack.useGlobalNamespaceScope() :: No current call'
            );
        });
    });
});
