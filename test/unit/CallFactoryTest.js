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
    Scope = require('../../src/Scope').sync();

describe('CallFactory', function () {
    beforeEach(function () {
        this.Call = sinon.stub();
        this.scope = sinon.createStubInstance(Scope);

        this.factory = new CallFactory(this.Call);
    });

    describe('create()', function () {
        it('should return an instance of Call', function () {
            expect(this.factory.create(this.scope)).to.be.an.instanceOf(this.Call);
        });

        it('should pass the scope to the Call constructor', function () {
            this.factory.create(this.scope);

            expect(this.Call).to.have.been.calledOnce;
            expect(this.Call).to.have.been.calledWith(this.scope);
        });
    });
});
