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
    CallInstrumentation = require('../../src/Instrumentation/CallInstrumentation'),
    Class = require('../../src/Class').sync(),
    Exception = phpCommon.Exception,
    InstrumentationFactory = require('../../src/Instrumentation/InstrumentationFactory'),
    IsolatedScope = require('../../src/OOP/Class/IsolatedScope'),
    Module = require('../../src/Module'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    NullValue = require('../../src/Value/Null').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    Scope = require('../../src/Scope').sync(),
    Trace = require('../../src/Control/Trace'),
    Trait = require('../../src/OOP/Trait/Trait'),
    Value = require('../../src/Value').sync();

describe('Call', function () {
    var argValue1,
        argValue2,
        call,
        instrumentationFactory,
        namespaceScope,
        newStaticClass,
        scope,
        trace;

    beforeEach(function () {
        argValue1 = sinon.createStubInstance(Value);
        argValue2 = sinon.createStubInstance(Value);
        instrumentationFactory = sinon.createStubInstance(InstrumentationFactory);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        newStaticClass = sinon.createStubInstance(Class);
        scope = sinon.createStubInstance(Scope);
        trace = sinon.createStubInstance(Trace);

        call = new Call(
            scope,
            namespaceScope,
            trace,
            instrumentationFactory,
            [argValue1, argValue2],
            newStaticClass
        );
    });

    describe('enableStrictTypes()', function () {
        it('should enable strict-types mode via the original NamespaceScope', function () {
            call.enableStrictTypes();

            expect(namespaceScope.enableStrictTypes).to.have.been.calledOnce;
        });
    });

    describe('enterIsolatedCall()', function () {
        it('should enter the isolated call correctly', function () {
            var enteredNamespaceScope = sinon.createStubInstance(NamespaceScope),
                finder = sinon.stub().returns(21),
                isolatedScope = sinon.createStubInstance(IsolatedScope);
            isolatedScope.getFinder.returns(finder);
            isolatedScope.getNamespaceScope.returns(enteredNamespaceScope);

            call.enterIsolatedCall(isolatedScope);

            expect(call.getIsolatedCallStackDepth()).to.equal(1);
            expect(call.getEnteredNamespaceScope()).to.equal(enteredNamespaceScope);
            expect(call.getEffectiveNamespaceScope()).to.equal(enteredNamespaceScope);
            expect(call.getLastLine()).to.equal(21);
        });
    });

    describe('getCurrentClass()', function () {
        it('should return the current Class from the Scope when not inside an isolated call', function () {
            var classObject = sinon.createStubInstance(Class);
            scope.getCurrentClass.returns(classObject);

            expect(call.getCurrentClass()).to.equal(classObject);
        });

        it('should return the current Class from the IsolatedScope when inside an isolated call', function () {
            var classObject = sinon.createStubInstance(Class),
                isolatedScope = sinon.createStubInstance(IsolatedScope);
            isolatedScope.getClass.returns(classObject);
            call.enterIsolatedCall(isolatedScope);

            expect(call.getCurrentClass()).to.equal(classObject);
        });
    });

    describe('getCurrentTrait()', function () {
        it('should return the current Trait from the Scope when not inside an isolated call', function () {
            var traitObject = sinon.createStubInstance(Trait);
            scope.getCurrentTrait.returns(traitObject);

            expect(call.getCurrentTrait()).to.equal(traitObject);
        });

        it('should return the current Trait from the IsolatedScope when inside an isolated call', function () {
            var traitObject = sinon.createStubInstance(Trait),
                isolatedScope = sinon.createStubInstance(IsolatedScope);
            isolatedScope.getTrait.returns(traitObject);

            call.enterIsolatedCall(isolatedScope);

            expect(call.getCurrentTrait()).to.equal(traitObject);
        });
    });

    describe('getEffectiveNamespaceScope()', function () {
        it('should return the NamespaceScope of the call initially', function () {
            expect(call.getEffectiveNamespaceScope()).to.equal(namespaceScope);
        });
    });

    describe('getEnteredNamespaceScope()', function () {
        it('should return null initially', function () {
            expect(call.getEnteredNamespaceScope()).to.be.null;
        });
    });

    describe('getFilePath()', function () {
        it('should return the path from the NamespaceScope of the call initially', function () {
            namespaceScope.getFilePath.returns('/my/current/file.php');

            expect(call.getFilePath()).to.equal('/my/current/file.php');
        });

        it('should return the path from the effective NamespaceScope when changed', function () {
            var module = sinon.createStubInstance(Module),
                topLevelNamespaceScope = sinon.createStubInstance(NamespaceScope);
            namespaceScope.getModule.returns(module);
            module.getTopLevelNamespaceScope.returns(topLevelNamespaceScope);
            topLevelNamespaceScope.getFilePath.returns('/my/effective/file.php');
            call.useGlobalNamespaceScope();

            expect(call.getFilePath()).to.equal('/my/effective/file.php');
        });
    });

    describe('getFunctionArgs()', function () {
        it('should return the argument Values passed to the called function', function () {
            var argValues = call.getFunctionArgs();

            expect(argValues).to.have.length(2);
            expect(argValues[0]).to.equal(argValue1);
            expect(argValues[1]).to.equal(argValue2);
        });
    });

    describe('getFunctionName()', function () {
        it('should return the current trace frame name from the Scope', function () {
            scope.getTraceFrameName.returns('myFunc');

            expect(call.getFunctionName()).to.equal('myFunc');
        });
    });

    describe('getGenerator()', function () {
        it('should return the current Generator ObjectValue when one has been set', function () {
            var generatorObjectValue = sinon.createStubInstance(ObjectValue);
            call.setGenerator(generatorObjectValue);

            expect(call.getGenerator()).to.equal(generatorObjectValue);
        });

        it('should throw when no Generator has been set', function () {
            expect(function () {
                call.getGenerator();
            }).to.throw(
                Exception,
                'Call.getGenerator() :: Current call is not a generator'
            );
        });
    });

    describe('getInstrumentation()', function () {
        it('should return a CallInstrumentation with the finder when the call has been instrumented', function () {
            var finder = sinon.stub(),
                instrumentation = sinon.createStubInstance(CallInstrumentation);
            call.instrument(finder);
            instrumentationFactory.createCallInstrumentation
                .withArgs(sinon.match.same(finder))
                .returns(instrumentation);

            expect(call.getInstrumentation()).to.equal(instrumentation);
        });

        it('should return a CallInstrumentation with no finder when the call has not been instrumented', function () {
            var instrumentation = sinon.createStubInstance(CallInstrumentation);
            instrumentationFactory.createCallInstrumentation
                .withArgs(null)
                .returns(instrumentation);

            expect(call.getInstrumentation()).to.equal(instrumentation);
        });
    });

    describe('getIsolatedCallStackDepth()', function () {
        it('should return 0 when no isolated calls have happened', function () {
            expect(call.getIsolatedCallStackDepth()).to.equal(0);
        });

        it('should return 1 when one isolated call has happened', function () {
            var isolatedScope = sinon.createStubInstance(IsolatedScope);
            call.enterIsolatedCall(isolatedScope);

            expect(call.getIsolatedCallStackDepth()).to.equal(1);
        });

        it('should return 2 when a second nested isolated call has happened', function () {
            var isolatedScope1 = sinon.createStubInstance(IsolatedScope),
                isolatedScope2 = sinon.createStubInstance(IsolatedScope);
            call.enterIsolatedCall(isolatedScope1);
            call.enterIsolatedCall(isolatedScope2);

            expect(call.getIsolatedCallStackDepth()).to.equal(2);
        });

        it('should return 0 when a single isolated call has been left', function () {
            var isolatedScope = sinon.createStubInstance(IsolatedScope);
            call.enterIsolatedCall(isolatedScope);
            call.leaveIsolatedCall(isolatedScope);

            expect(call.getIsolatedCallStackDepth()).to.equal(0);
        });
    });

    describe('getLastLine()', function () {
        describe('when there has been no isolated call', function () {
            it('should return the current line from the Finder if instrumented', function () {
                var finder = sinon.stub().returns(123);
                call.instrument(finder);

                expect(call.getLastLine()).to.equal(123);
            });

            it('should return null if not instrumented', function () {
                expect(call.getLastLine()).to.be.null;
            });
        });

        describe('when inside an isolated call', function () {
            it('should return the line number of the current isolated call', function () {
                var enteredNamespaceScope = sinon.createStubInstance(NamespaceScope),
                    originalFinder = sinon.stub(),
                    isolatedCallFinder = sinon.stub(),
                    isolatedScope = sinon.createStubInstance(IsolatedScope),
                    instrumentation = sinon.createStubInstance(CallInstrumentation);
                originalFinder.onFirstCall().returns(123); // Read in .enterIsolatedCall(...).
                isolatedCallFinder.returns(321); // Read in .getLastLine(...).
                isolatedScope.getFinder.returns(isolatedCallFinder);
                isolatedScope.getNamespaceScope.returns(enteredNamespaceScope);
                call.instrument(originalFinder);
                instrumentation.getFinder.returns(isolatedCallFinder);
                call.enterIsolatedCall(isolatedScope);

                expect(call.getLastLine()).to.equal(321);
            });
        });

        describe('after an isolated call has completed', function () {
            it('should return the entry line number before the last isolated call when the outer call has not yet moved on', function () {
                var enteredNamespaceScope = sinon.createStubInstance(NamespaceScope),
                    originalFinder = sinon.stub(),
                    isolatedCallFinder = sinon.stub().returns(321),
                    isolatedScope = sinon.createStubInstance(IsolatedScope),
                    instrumentation = sinon.createStubInstance(CallInstrumentation);
                isolatedScope.getFinder.returns(isolatedCallFinder);
                isolatedScope.getNamespaceScope.returns(enteredNamespaceScope);
                originalFinder.onFirstCall().returns(123); // Read in .enterIsolatedCall(...).
                originalFinder.onSecondCall().returns(124); // Read in .leaveIsolatedCall(...).
                originalFinder.onThirdCall().returns(124); // Read in .getLastLine().
                call.instrument(originalFinder);
                instrumentation.getFinder.returns(isolatedCallFinder);
                call.enterIsolatedCall(isolatedScope);
                call.leaveIsolatedCall(isolatedScope);

                expect(call.getLastLine()).to.equal(123);
            });

            it('should return the latest outer call line number when the outer call has moved on', function () {
                var enteredNamespaceScope = sinon.createStubInstance(NamespaceScope),
                    originalFinder = sinon.stub(),
                    isolatedCallFinder = sinon.stub().returns(321),
                    isolatedScope = sinon.createStubInstance(IsolatedScope),
                    instrumentation = sinon.createStubInstance(CallInstrumentation);
                isolatedScope.getFinder.returns(isolatedCallFinder);
                isolatedScope.getNamespaceScope.returns(enteredNamespaceScope);
                originalFinder.onFirstCall().returns(123); // Read in .enterIsolatedCall(...).
                originalFinder.onSecondCall().returns(124); // Read in .leaveIsolatedCall(...).
                originalFinder.onThirdCall().returns(127); // Read in .getLastLine().
                call.instrument(originalFinder);
                instrumentation.getFinder.returns(isolatedCallFinder);
                call.enterIsolatedCall(isolatedScope);
                call.leaveIsolatedCall(isolatedScope);

                expect(call.getLastLine()).to.equal(127);
            });

            it('should return the latest outer call line number when the outer call has moved on but later returned to the same line', function () {
                var enteredNamespaceScope = sinon.createStubInstance(NamespaceScope),
                    originalFinder = sinon.stub(),
                    isolatedCallFinder = sinon.stub().returns(321),
                    isolatedScope = sinon.createStubInstance(IsolatedScope),
                    instrumentation = sinon.createStubInstance(CallInstrumentation);
                isolatedScope.getFinder.returns(isolatedCallFinder);
                isolatedScope.getNamespaceScope.returns(enteredNamespaceScope);
                originalFinder.onFirstCall().returns(123); // Read in .enterIsolatedCall(...).
                originalFinder.onSecondCall().returns(124); // Read in .leaveIsolatedCall(...).
                originalFinder.onThirdCall().returns(127); // Read in .getLastLine().
                originalFinder.onCall(3).returns(124); // Read in .getLastLine().
                call.instrument(originalFinder);
                instrumentation.getFinder.returns(isolatedCallFinder);
                call.enterIsolatedCall(isolatedScope);
                call.leaveIsolatedCall(isolatedScope);
                call.getLastLine();

                expect(call.getLastLine()).to.equal(124);
            });
        });
    });

    describe('getScope()', function () {
        it('should return the scope', function () {
            expect(call.getScope()).to.equal(scope);
        });
    });

    describe('getStaticClass()', function () {
        it('should return the class of the $this object when an ObjectValue is set', function () {
            var classObject = sinon.createStubInstance(Class),
                thisObject = sinon.createStubInstance(ObjectValue);
            thisObject.getClass.returns(classObject);
            thisObject.getType.returns('object');
            scope.getThisObject.returns(thisObject);

            expect(call.getStaticClass()).to.equal(classObject);
        });

        it('should return the new static class when $this is a NullValue', function () {
            var thisObject = sinon.createStubInstance(NullValue);
            thisObject.getType.returns('null');
            scope.getThisObject.returns(thisObject);

            expect(call.getStaticClass()).to.equal(newStaticClass);
        });

        it('should return the new static class for this call when no $this object is set', function () {
            expect(call.getStaticClass()).to.equal(newStaticClass);
        });

        it('should return null when neither a $this object nor a new static class are set', function () {
            call = new Call(
                scope,
                namespaceScope,
                trace,
                instrumentationFactory,
                [argValue1, argValue2],
                null // No new static class (eg. forwarding static call)
            );

            expect(call.getStaticClass()).to.be.null;
        });
    });

    describe('getThisObject()', function () {
        it('should return the this object from the scope', function () {
            var thisObject = sinon.createStubInstance(ObjectValue);
            scope.getThisObject.returns(thisObject);

            expect(call.getThisObject()).to.equal(thisObject);
        });
    });

    describe('getTrace()', function () {
        it('should fetch the Trace for this call', function () {
            expect(call.getTrace()).to.equal(trace);
        });
    });

    describe('getTraceFilePath()', function () {
        it('should fetch the path via the Scope', function () {
            namespaceScope.getFilePath.returns('/my/module_path.php');
            scope.getFilePath
                .withArgs('/my/module_path.php')
                .returns('/my/module_path.php with some additional context');

            expect(call.getTraceFilePath()).to.equal('/my/module_path.php with some additional context');
        });
    });

    describe('isStrictTypesMode()', function () {
        it('should return true when the original NamespaceScope is in strict-types mode', function () {
            namespaceScope.isStrictTypesMode.returns(true);

            expect(call.isStrictTypesMode()).to.be.true;
        });

        it('should return false when the original NamespaceScope is in weak type-checking mode', function () {
            namespaceScope.isStrictTypesMode.returns(false);

            expect(call.isStrictTypesMode()).to.be.false;
        });
    });

    describe('isUserland()', function () {
        it('should return true when the called function was not defined in the global NamespaceScope', function () {
            namespaceScope.isGlobal.returns(false);

            expect(call.isUserland()).to.be.true;
        });

        it('should return false when the called function was defined in the global NamespaceScope', function () {
            namespaceScope.isGlobal.returns(true);

            expect(call.isUserland()).to.be.false;
        });
    });

    describe('leaveIsolatedCall()', function () {
        var enteredNamespaceScope,
            instrumentation,
            isolatedCallFinder;

        beforeEach(function () {
            enteredNamespaceScope = sinon.createStubInstance(NamespaceScope);
            instrumentation = sinon.createStubInstance(CallInstrumentation);
            isolatedCallFinder = sinon.stub().returns(321);
            instrumentation.getFinder.returns(isolatedCallFinder);
        });

        it('should leave the isolated call correctly', function () {
            var isolatedScope = sinon.createStubInstance(IsolatedScope),
                originalFinder = sinon.stub().returns(123);
            isolatedScope.getFinder.returns(isolatedCallFinder);
            isolatedScope.getNamespaceScope.returns(enteredNamespaceScope);
            call.instrument(originalFinder);
            call.enterIsolatedCall(isolatedScope);

            call.leaveIsolatedCall(isolatedScope);

            expect(call.getIsolatedCallStackDepth()).to.equal(0);
            expect(call.getEnteredNamespaceScope()).to.be.null;
            expect(call.getEffectiveNamespaceScope()).to.equal(
                namespaceScope,
                'Should have returned to the outer call NamespaceScope'
            );
            expect(call.getLastLine()).to.equal(123);
        });

        it('should throw if there is no current isolated call', function () {
            var isolatedScope = sinon.createStubInstance(IsolatedScope);

            expect(function () {
                call.leaveIsolatedCall(isolatedScope);
            }).to.throw(
                Exception,
                'Call.leaveIsolatedCall() :: Isolated call stack is empty'
            );
        });

        it('should throw if the wrong IsolatedScope is given', function () {
            var isolatedScope = sinon.createStubInstance(IsolatedScope),
                incorrectIsolatedScope = sinon.createStubInstance(IsolatedScope);
            call.enterIsolatedCall(isolatedScope);

            expect(function () {
                call.leaveIsolatedCall(incorrectIsolatedScope);
            }).to.throw(
                Exception,
                'Call.leaveIsolatedCall() :: Incorrect IsolatedScope provided'
            );
        });
    });

    describe('resume()', function () {
        it('should resume this call\'s trace with the given result value', function () {
            var result = {my: 'result'};

            call.resume(result);

            expect(trace.resume).to.have.been.calledOnce;
            expect(trace.resume).to.have.been.calledWith(sinon.match.same(result));
        });
    });

    describe('setTrace()', function () {
        it('should set the Trace of this call to the provided one', function () {
            var newTrace = sinon.createStubInstance(Trace);

            call.setTrace(newTrace);

            expect(call.getTrace()).to.equal(newTrace);
        });

        it('should return the original Trace', function () {
            var newTrace = sinon.createStubInstance(Trace);

            expect( call.setTrace(newTrace)).to.equal(trace);
        });
    });

    describe('throwInto()', function () {
        it('should throw into this call\'s trace with the given result error', function () {
            var error = new Error('My error');

            call.throwInto(error);

            expect(trace.throwInto).to.have.been.calledOnce;
            expect(trace.throwInto).to.have.been.calledWith(sinon.match.same(error));
        });
    });

    describe('useDescendantNamespaceScope()', function () {
        var descendantNamespaceScope,
            module,
            topLevelNamespaceScope;

        beforeEach(function () {
            descendantNamespaceScope = sinon.createStubInstance(NamespaceScope);
            module = sinon.createStubInstance(Module);
            topLevelNamespaceScope = sinon.createStubInstance(NamespaceScope);

            namespaceScope.getModule.returns(module);
            module.getTopLevelNamespaceScope.returns(topLevelNamespaceScope);
            topLevelNamespaceScope.getDescendant
                .withArgs('MyDescendant')
                .returns(descendantNamespaceScope);
        });

        it('should enter the descendant NamespaceScope of the original one', function () {
            expect(call.useDescendantNamespaceScope('MyDescendant')).to.equal(
                descendantNamespaceScope,
                'Original NamespaceScope should be returned'
            );
            expect(call.getEffectiveNamespaceScope()).to.equal(
                descendantNamespaceScope,
                'The descendant NamespaceScope should become effective'
            );
            expect(call.getEnteredNamespaceScope()).to.equal(
                null,
                'No NamespaceScope should have been entered'
            );
        });

        it('should throw if an isolated call has been entered', function () {
            var enteredNamespaceScope = sinon.createStubInstance(NamespaceScope),
                isolatedScope = sinon.createStubInstance(IsolatedScope);
            isolatedScope.getFinder.returns(null);
            isolatedScope.getNamespaceScope.returns(enteredNamespaceScope);
            call.enterIsolatedCall(isolatedScope);

            expect(function () {
                call.useDescendantNamespaceScope('MyDescendant');
            }).to.throw(
                Exception,
                'Call.useDescendantNamespaceScope() :: Cannot be inside an isolated call'
            );
        });
    });

    describe('useGlobalNamespaceScope()', function () {
        var module,
            topLevelNamespaceScope;

        beforeEach(function () {
            module = sinon.createStubInstance(Module);
            topLevelNamespaceScope = sinon.createStubInstance(NamespaceScope);

            namespaceScope.getModule.returns(module);
            module.getTopLevelNamespaceScope.returns(topLevelNamespaceScope);
        });

        it('should enter the top-level NamespaceScope for the original one\'s module', function () {
            expect(call.useGlobalNamespaceScope()).to.equal(
                topLevelNamespaceScope,
                'Top-level NamespaceScope of module should be returned'
            );
            expect(call.getEffectiveNamespaceScope()).to.equal(
                topLevelNamespaceScope,
                'Top-level NamespaceScope should become effective'
            );
            expect(call.getEnteredNamespaceScope()).to.equal(
                null,
                'No NamespaceScope should have been entered'
            );
        });

        it('should throw if an isolated call has been entered', function () {
            var enteredNamespaceScope = sinon.createStubInstance(NamespaceScope),
                isolatedScope = sinon.createStubInstance(IsolatedScope);
            isolatedScope.getFinder.returns(null);
            isolatedScope.getNamespaceScope.returns(enteredNamespaceScope);
            call.enterIsolatedCall(isolatedScope);

            expect(function () {
                call.useGlobalNamespaceScope();
            }).to.throw(
                Exception,
                'Call.useGlobalNamespaceScope() :: Cannot be inside an isolated call'
            );
        });
    });
});
