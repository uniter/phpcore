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
    CallFactory = require('../../src/CallFactory'),
    Class = require('../../src/Class').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    Scope = require('../../src/Scope').sync(),
    Value = require('../../src/Value').sync();

describe('CallFactory', function () {
    beforeEach(function () {
        this.Call = sinon.stub();
        this.FFICall = sinon.stub();
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.scope = sinon.createStubInstance(Scope);

        this.factory = new CallFactory(this.Call, this.FFICall);
    });

    describe('create()', function () {
        it('should return an instance of Call', function () {
            expect(this.factory.create(this.scope, this.namespaceScope)).to.be.an.instanceOf(this.Call);
        });

        it('should pass the Scope to the Call constructor', function () {
            this.factory.create(this.scope, this.namespaceScope);

            expect(this.Call).to.have.been.calledOnce;
            expect(this.Call).to.have.been.calledWith(sinon.match.same(this.scope));
        });

        it('should pass the NamespaceScope to the Call constructor', function () {
            this.factory.create(this.scope, this.namespaceScope);

            expect(this.Call).to.have.been.calledOnce;
            expect(this.Call).to.have.been.calledWith(sinon.match.any, sinon.match.same(this.namespaceScope));
        });

        it('should pass the argument values to the Call constructor if specified', function () {
            var argValue1 = sinon.createStubInstance(Value),
                argValue2 = sinon.createStubInstance(Value);

            this.factory.create(this.scope, this.namespaceScope, [argValue1, argValue2]);

            expect(this.Call).to.have.been.calledOnce;
            expect(this.Call).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match([sinon.match.same(argValue1), sinon.match.same(argValue2)])
            );
        });

        it('should pass an empty array of argument values to the Call constructor if none specified', function () {
            this.factory.create(this.scope, this.namespaceScope);

            expect(this.Call).to.have.been.calledOnce;
            expect(this.Call).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match([])
            );
        });

        it('should pass the new static class to the Call constructor if specified', function () {
            var newStaticClass = sinon.createStubInstance(Class);

            this.factory.create(this.scope, this.namespaceScope, [], newStaticClass);

            expect(this.Call).to.have.been.calledOnce;
            expect(this.Call).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(newStaticClass)
            );
        });

        it('should pass null as the new static class to the Call constructor if none specified', function () {
            this.factory.create(this.scope, this.namespaceScope);

            expect(this.Call).to.have.been.calledOnce;
            expect(this.Call).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });
    });

    describe('createFFICall()', function () {
        it('should return an instance of FFICall', function () {
            expect(this.factory.createFFICall()).to.be.an.instanceOf(this.FFICall);
        });

        it('should pass the argument values to the Call constructor if specified', function () {
            var argValue1 = sinon.createStubInstance(Value),
                argValue2 = sinon.createStubInstance(Value);

            this.factory.createFFICall([argValue1, argValue2]);

            expect(this.FFICall).to.have.been.calledOnce;
            expect(this.FFICall).to.have.been.calledWith(
                sinon.match([sinon.match.same(argValue1), sinon.match.same(argValue2)])
            );
        });

        it('should pass an empty array of argument values to the Call constructor if none specified', function () {
            this.factory.createFFICall();

            expect(this.FFICall).to.have.been.calledOnce;
            expect(this.FFICall).to.have.been.calledWith(sinon.match([]));
        });
    });
});
