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
    Value = require('../../src/Value').sync();

describe('Call', function () {
    beforeEach(function () {
        this.argValue1 = sinon.createStubInstance(Value);
        this.argValue2 = sinon.createStubInstance(Value);
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.newStaticClass = sinon.createStubInstance(Class);
        this.scope = sinon.createStubInstance(Scope);

        this.call = new Call(this.scope, this.namespaceScope, [this.argValue1, this.argValue2], this.newStaticClass);
    });

    describe('getCurrentClass()', function () {
        it('should return the current Class from the Scope', function () {
            var classObject = sinon.createStubInstance(Class);
            this.scope.getCurrentClass.returns(classObject);

            expect(this.call.getCurrentClass()).to.equal(classObject);
        });
    });

    describe('getFilePath()', function () {
        it('should return the path from the NamespaceScope', function () {
            this.namespaceScope.getFilePath.returns('/my/current/file.php');

            expect(this.call.getFilePath()).to.equal('/my/current/file.php');
        });
    });

    describe('getFunctionArgs()', function () {
        it('should return the argument Values passed to the called function', function () {
            var argValues = this.call.getFunctionArgs();

            expect(argValues).to.have.length(2);
            expect(argValues[0]).to.equal(this.argValue1);
            expect(argValues[1]).to.equal(this.argValue2);
        });
    });

    describe('getFunctionName()', function () {
        it('should return the current trace frame name from the Scope', function () {
            this.scope.getTraceFrameName.returns('myFunc');

            expect(this.call.getFunctionName()).to.equal('myFunc');
        });
    });

    describe('getLastLine()', function () {
        it('should return the current line from the Finder if instrumented', function () {
            var finder = sinon.stub().returns(123);
            this.call.instrument(finder);

            expect(this.call.getLastLine()).to.equal(123);
        });

        it('should return null if not instrumented', function () {
            expect(this.call.getLastLine()).to.be.null;
        });
    });

    describe('getScope()', function () {
        it('should return the scope', function () {
            expect(this.call.getScope()).to.equal(this.scope);
        });
    });

    describe('getStaticClass()', function () {
        it('should return the class of the $this object when an ObjectValue is set', function () {
            var classObject = sinon.createStubInstance(Class),
                thisObject = sinon.createStubInstance(ObjectValue);
            thisObject.getClass.returns(classObject);
            thisObject.getType.returns('object');
            this.scope.getThisObject.returns(thisObject);

            expect(this.call.getStaticClass()).to.equal(classObject);
        });

        it('should return the new static class when $this is a NullValue', function () {
            var thisObject = sinon.createStubInstance(NullValue);
            thisObject.getType.returns('null');
            this.scope.getThisObject.returns(thisObject);

            expect(this.call.getStaticClass()).to.equal(this.newStaticClass);
        });

        it('should return the new static class for this call when no $this object is set', function () {
            expect(this.call.getStaticClass()).to.equal(this.newStaticClass);
        });

        it('should return null when neither a $this object nor a new static class are set', function () {
            this.call = new Call(
                this.scope,
                this.namespaceScope,
                [this.argValue1, this.argValue2],
                null // No new static class (eg. forwarding static call)
            );

            expect(this.call.getStaticClass()).to.be.null;
        });
    });

    describe('getThisObject()', function () {
        it('should return the this object from the scope', function () {
            var thisObject = sinon.createStubInstance(ObjectValue);
            this.scope.getThisObject.returns(thisObject);

            expect(this.call.getThisObject()).to.equal(thisObject);
        });
    });

    describe('getTraceFilePath()', function () {
        it('should fetch the path via the Scope', function () {
            this.namespaceScope.getFilePath.returns('/my/module_path.php');
            this.scope.getFilePath
                .withArgs('/my/module_path.php')
                .returns('/my/module_path.php with some additional context');

            expect(this.call.getTraceFilePath()).to.equal('/my/module_path.php with some additional context');
        });
    });

    describe('isUserland()', function () {
        it('should return true when the called function was not defined in the global NamespaceScope', function () {
            this.namespaceScope.isGlobal.returns(false);

            expect(this.call.isUserland()).to.be.true;
        });

        it('should return false when the called function was defined in the global NamespaceScope', function () {
            this.namespaceScope.isGlobal.returns(true);

            expect(this.call.isUserland()).to.be.false;
        });
    });
});
