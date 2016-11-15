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
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    Scope = require('../../src/Scope').sync(),
    Value = require('../../src/Value').sync();

describe('CallFactory', function () {
    beforeEach(function () {
        this.Call = sinon.stub();
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.scope = sinon.createStubInstance(Scope);

        this.factory = new CallFactory(this.Call);
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
    });
});
