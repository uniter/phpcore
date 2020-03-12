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
    Call = require('../../src/Call'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    ErrorReporting = require('../../src/Error/ErrorReporting'),
    Namespace = require('../../src/Namespace').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError,
    Scope = require('../../src/Scope').sync(),
    Translator = phpCommon.Translator,
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('CallStack', function () {
    beforeEach(function () {
        this.errorReporting = sinon.createStubInstance(ErrorReporting);
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.translator = sinon.createStubInstance(Translator);
        this.valueFactory = new ValueFactory();

        this.valueFactory.setGlobalNamespace(this.globalNamespace);

        this.callStack = new CallStack(this.valueFactory, this.translator, this.errorReporting);
    });

    describe('getCaller()', function () {
        it('should return the caller call when there is one', function () {
            var callerCall = sinon.createStubInstance(Call),
                currentCall = sinon.createStubInstance(Call);
            this.callStack.push(callerCall);
            this.callStack.push(currentCall);

            expect(this.callStack.getCaller()).to.equal(callerCall);
        });

        it('should return null when the current call is the top-level one', function () {
            var currentCall = sinon.createStubInstance(Call);
            this.callStack.push(currentCall);

            expect(this.callStack.getCaller()).to.be.null;
        });

        it('should return null when the call stack is empty', function () {
            expect(this.callStack.getCaller()).to.be.null;
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
            this.callStack.push(initialCall);
            this.callStack.push(userlandCall1);
            this.callStack.push(userlandCall2);
            userlandCall1.getFilePath.returns('/my/caller/module.php');

            expect(this.callStack.getCallerFilePath()).to.equal('/my/caller/module.php');
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
            this.callStack.push(initialCall);
            this.callStack.push(userlandCall1);
            this.callStack.push(userlandCall2);
            userlandCall1.getLastLine.returns(21);

            expect(this.callStack.getCallerLastLine()).to.equal(21);
        });
    });

    describe('getCallerScope()', function () {
        it('should return the scope of the caller call when there is one', function () {
            var callerCall = sinon.createStubInstance(Call),
                callerScope = sinon.createStubInstance(Scope),
                currentCall = sinon.createStubInstance(Call);
            callerCall.getScope.returns(callerScope);
            this.callStack.push(callerCall);
            this.callStack.push(currentCall);

            expect(this.callStack.getCallerScope()).to.equal(callerScope);
        });

        it('should return null when the current call is the top-level one', function () {
            var currentCall = sinon.createStubInstance(Call);
            this.callStack.push(currentCall);

            expect(this.callStack.getCallerScope()).to.be.null;
        });

        it('should return null when the call stack is empty', function () {
            expect(this.callStack.getCallerScope()).to.be.null;
        });
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

    describe('getCurrentClass()', function () {
        it('should return the current class for the current Call when there are 3 on the stack', function () {
            var currentCall = sinon.createStubInstance(Call),
                currentClass = sinon.createStubInstance(Class);
            currentCall.getCurrentClass.returns(currentClass);
            this.callStack.push(sinon.createStubInstance(Call));
            this.callStack.push(sinon.createStubInstance(Call));
            this.callStack.push(currentCall);

            expect(this.callStack.getCurrentClass()).to.equal(currentClass);
        });

        it('should return null when there is no call on the stack', function () {
            expect(this.callStack.getCurrentClass()).to.equal(null);
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
            this.callStack.push(initialCall);
            this.callStack.push(userlandCall);
            this.callStack.push(builtinCall);
            userlandCall.getFilePath.returns('/my/current/module.php');

            expect(this.callStack.getLastFilePath()).to.equal('/my/current/module.php');
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
            this.callStack.push(initialCall);
            this.callStack.push(userlandCall);
            this.callStack.push(builtinCall);
            userlandCall.getLastLine.returns(27);

            expect(this.callStack.getLastLine()).to.equal(27);
        });
    });

    describe('getLength()', function () {
        it('should return the number of calls on the stack', function () {
            var callerCall = sinon.createStubInstance(Call),
                currentCall = sinon.createStubInstance(Call);
            this.callStack.push(callerCall);
            this.callStack.push(currentCall);

            expect(this.callStack.getLength()).to.equal(2);
        });
    });

    describe('getStaticClass()', function () {
        it('should return the static class for the current call, if it has one specified', function () {
            var callerCall = sinon.createStubInstance(Call),
                currentCall = sinon.createStubInstance(Call),
                currentStaticClass = sinon.createStubInstance(Class);
            currentCall.getStaticClass.returns(currentStaticClass);
            this.callStack.push(callerCall);
            this.callStack.push(currentCall);

            expect(this.callStack.getStaticClass()).to.equal(currentStaticClass);
        });

        it('should return the static class for the caller, if it has one specified', function () {
            var callerCall = sinon.createStubInstance(Call),
                callerStaticClass = sinon.createStubInstance(Class),
                currentCall = sinon.createStubInstance(Call);
            currentCall.getStaticClass.returns(null);
            callerCall.getStaticClass.returns(callerStaticClass);
            this.callStack.push(callerCall);
            this.callStack.push(currentCall);

            expect(this.callStack.getStaticClass()).to.equal(callerStaticClass);
        });

        it('should return null when the call stack is empty', function () {
            expect(this.callStack.getStaticClass()).to.be.null;
        });
    });

    describe('getThisObject()', function () {
        it('should return the `$this` object from the scope of the current Call', function () {
            var currentCall = sinon.createStubInstance(Call),
                thisObjectValue = sinon.createStubInstance(ObjectValue);
            this.callStack.push(sinon.createStubInstance(Call));
            this.callStack.push(currentCall);
            currentCall.getThisObject.returns(thisObjectValue);

            expect(this.callStack.getThisObject()).to.equal(thisObjectValue);
        });

        it('should return null when the call stack is empty', function () {
            expect(this.callStack.getThisObject()).to.be.null;
        });
    });

    describe('getTrace()', function () {
        it('should return an empty array when there are no calls on the stack', function () {
            expect(this.callStack.getTrace()).to.deep.equal([]);
        });

        describe('with three calls', function () {
            beforeEach(function () {
                this.entryCall = sinon.createStubInstance(Call);
                this.entryCall.getTraceFilePath.returns('(Entry file)');
                this.entryCall.getLastLine.returns(4);
                this.firstCall = sinon.createStubInstance(Call);
                this.firstCall.getTraceFilePath.returns('/path/to/oldest/call.php');
                this.firstCallArgs = [sinon.createStubInstance(Value)];
                this.firstCall.getFunctionArgs.returns(this.firstCallArgs);
                this.firstCall.getFunctionName.returns('myOldestCalledFunc');
                this.firstCall.getLastLine.returns(100);
                this.secondCall = sinon.createStubInstance(Call);
                this.secondCall.getTraceFilePath.returns('/path/to/second/call.php');
                this.secondCallArgs = [sinon.createStubInstance(Value)];
                this.secondCall.getFunctionArgs.returns(this.secondCallArgs);
                this.secondCall.getFunctionName.returns('mySecondCalledFunc');
                this.secondCall.getLastLine.returns(21);
                this.thirdCall = sinon.createStubInstance(Call);
                this.thirdCall.getTraceFilePath.returns('/path/to/newest/call.php');
                this.thirdCallArgs = [sinon.createStubInstance(Value)];
                this.thirdCall.getFunctionArgs.returns(this.thirdCallArgs);
                this.thirdCall.getFunctionName.returns('myMostRecentlyCalledFunc');
                this.thirdCall.getLastLine.returns(27);
                this.callStack.push(this.entryCall); // Entry call gets ignored
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

                expect(trace[0].file).to.equal('/path/to/second/call.php');
                expect(trace[1].file).to.equal('/path/to/oldest/call.php');
                expect(trace[2].file).to.equal('(Entry file)');
            });

            it('should give each entry the correct line (from the previous call)', function () {
                var trace = this.callStack.getTrace();

                // We return the previous call's line number, as that is the line
                // the call was made from in the calling file
                expect(trace[0].line).to.equal(21);
                expect(trace[1].line).to.equal(100);
                expect(trace[2].line).to.equal(4);
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

    describe('getUserlandCallee()', function () {
        it('should return null when the call stack is empty', function () {
            expect(this.callStack.getUserlandCallee()).to.be.null;
        });

        it('should return the first call when none on the stack are userland', function () {
            var initialCall = sinon.createStubInstance(Call),
                intermediateCall = sinon.createStubInstance(Call),
                builtinCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            intermediateCall.isUserland.returns(false);
            builtinCall.isUserland.returns(false);
            this.callStack.push(initialCall);
            this.callStack.push(intermediateCall);
            this.callStack.push(builtinCall);

            expect(this.callStack.getUserlandCallee()).to.equal(initialCall);
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
            this.callStack.push(initialCall);
            this.callStack.push(userlandCall1);
            this.callStack.push(userlandCall2);
            this.callStack.push(builtinCall);

            expect(this.callStack.getUserlandCallee()).to.equal(userlandCall2);
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
            this.callStack.push(initialCall);
            this.callStack.push(userlandCall1);
            this.callStack.push(userlandCall2);
            this.callStack.push(userlandCall3);

            expect(this.callStack.getUserlandCallee()).to.equal(userlandCall3);
        });
    });

    describe('getUserlandCaller()', function () {
        it('should return null when the call stack is empty', function () {
            expect(this.callStack.getUserlandCaller()).to.be.null;
        });

        it('should return the first call when none on the stack are userland', function () {
            var initialCall = sinon.createStubInstance(Call),
                intermediateCall = sinon.createStubInstance(Call),
                builtinCall = sinon.createStubInstance(Call);
            initialCall.isUserland.returns(false);
            intermediateCall.isUserland.returns(false);
            builtinCall.isUserland.returns(false);
            this.callStack.push(initialCall);
            this.callStack.push(intermediateCall);
            this.callStack.push(builtinCall);

            expect(this.callStack.getUserlandCaller()).to.equal(initialCall);
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
            this.callStack.push(initialCall);
            this.callStack.push(userlandCall1);
            this.callStack.push(userlandCall2);
            this.callStack.push(builtinCall);

            expect(this.callStack.getUserlandCaller()).to.equal(userlandCall2);
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
            this.callStack.push(initialCall);
            this.callStack.push(userlandCall1);
            this.callStack.push(userlandCall2);
            this.callStack.push(userlandCall3);

            expect(this.callStack.getUserlandCaller()).to.equal(userlandCall1);
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

    describe('raiseError()', function () {
        beforeEach(function () {
            this.whenThereAreCallsOnTheStack = function () {
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

                this.callStack.push(initialCall);
                this.callStack.push(userlandCall);
                this.callStack.push(builtinCall);
            }.bind(this);
        });

        describe('for a non-fatal error when there are calls on the stack', function () {
            beforeEach(function () {
                this.whenThereAreCallsOnTheStack();
            });

            it('should report the error via ErrorReporting when no errors are suppressed', function () {
                this.callStack.raiseError(PHPError.E_WARNING, 'This may or may not be bad.', null, true);

                expect(this.errorReporting.reportError).to.have.been.calledOnce;
                expect(this.errorReporting.reportError).to.have.been.calledWith(
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
                this.callStack.raiseError(PHPError.E_WARNING, 'This may or may not be bad.', null, true);

                expect(this.errorReporting.reportError).to.have.been.calledOnce;
                expect(this.errorReporting.reportError).to.have.been.calledWith(
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
                this.whenThereAreCallsOnTheStack();
            });

            it('should not invoke ErrorReporting', function () {
                try {
                    this.callStack.raiseError(PHPError.E_ERROR, 'Oh dear...!');
                } catch (error) {}

                expect(this.errorReporting.reportError).not.to.have.been.called;
            });

            it('should throw a PHPFatalError with the correct message and context', function () {
                expect(function () {
                    this.callStack.raiseError(PHPError.E_ERROR, 'Oh dear...!');
                }.bind(this)).to.throw(
                    PHPFatalError,
                    // Context should be the userland caller when the current function is a builtin
                    'PHP Fatal error: Oh dear...! in /my/userland/module.php on line 101'
                );
            });
        });

        describe('for a fatal error when there are no calls on the stack', function () {
            it('should not invoke ErrorReporting', function () {
                try {
                    this.callStack.raiseError(PHPError.E_ERROR, 'Oh dear...!');
                } catch (error) {}

                expect(this.errorReporting.reportError).not.to.have.been.called;
            });

            it('should throw a PHPFatalError with the correct message and context', function () {
                expect(function () {
                    this.callStack.raiseError(PHPError.E_ERROR, 'Oh dear...!');
                }.bind(this)).to.throw(
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
            // for things like checking for error suppression
            this.callStack.push(sinon.createStubInstance(Call));
        });

        it('should throw an ObjectValue wrapping an instance of Error when the E_ERROR level is given', function () {
            var caughtError = null,
                errorClassObject = sinon.createStubInstance(Class),
                errorValue = sinon.createStubInstance(ObjectValue);
            this.globalNamespace.getClass
                .withArgs('MySubError')
                .returns(errorClassObject);
            this.translator.translate
                .withArgs('my_translation_key', {
                    my_placeholder: 'My value'
                })
                .returns('My translated message');
            errorClassObject.instantiate
                .withArgs([
                    sinon.match(function (arg) {
                        return arg.getNative() === 'My translated message';
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === 0;
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === null;
                    })
                ])
                .returns(errorValue);

            try {
                this.callStack.raiseTranslatedError(
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
                caughtError = error;
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
            this.translator.translate
                .withArgs('my_translation_key', {
                    my_placeholder: 'My value'
                })
                .returns('My translated message');

            this.callStack.raiseTranslatedError(
                PHPError.E_WARNING,
                'my_translation_key',
                {
                    my_placeholder: 'My value'
                },
                'MySubError',
                false
            );

            expect(this.errorReporting.reportError).to.have.been.calledOnce;
            expect(this.errorReporting.reportError).to.have.been.calledWith(
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

            this.callStack.push(initialCall);
            this.callStack.push(userlandCall);
            this.callStack.push(builtinCall);

            this.translator.translate
                .withArgs('my_translation_key', {
                    my_placeholder: 'My value'
                })
                .returns('My translated error message!');
        });

        it('should throw a PHPFatalError with the correct message and context', function () {
            expect(function () {
                this.callStack.raiseUncatchableFatalError('my_translation_key', {
                    my_placeholder: 'My value'
                });
            }.bind(this)).to.throw(
                PHPFatalError,
                // Context should be the userland caller when the current function is a builtin
                'PHP Fatal error: My translated error message! in /my/userland/module.php on line 101'
            );
        });
    });
});
