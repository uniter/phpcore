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
    Class = require('../../src/Class').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    NullValue = require('../../src/Value/Null').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    Scope = require('../../src/Scope').sync(),
    Trace = require('../../src/Control/Trace'),
    Value = require('../../src/Value').sync();

describe('Call', function () {
    var argValue1,
        argValue2,
        call,
        namespaceScope,
        newStaticClass,
        scope,
        trace;

    beforeEach(function () {
        argValue1 = sinon.createStubInstance(Value);
        argValue2 = sinon.createStubInstance(Value);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        newStaticClass = sinon.createStubInstance(Class);
        scope = sinon.createStubInstance(Scope);
        trace = sinon.createStubInstance(Trace);

        call = new Call(scope, namespaceScope, trace, [argValue1, argValue2], newStaticClass);
    });

    describe('getCurrentClass()', function () {
        it('should return the current Class from the Scope', function () {
            var classObject = sinon.createStubInstance(Class);
            scope.getCurrentClass.returns(classObject);

            expect(call.getCurrentClass()).to.equal(classObject);
        });
    });

    describe('getFilePath()', function () {
        it('should return the path from the NamespaceScope', function () {
            namespaceScope.getFilePath.returns('/my/current/file.php');

            expect(call.getFilePath()).to.equal('/my/current/file.php');
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

    describe('getLastLine()', function () {
        it('should return the current line from the Finder if instrumented', function () {
            var finder = sinon.stub().returns(123);
            call.instrument(finder);

            expect(call.getLastLine()).to.equal(123);
        });

        it('should return null if not instrumented', function () {
            expect(call.getLastLine()).to.be.null;
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
});
