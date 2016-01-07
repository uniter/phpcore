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
    Environment = require('../../src/Environment'),
    PHPState = require('../../src/PHPState').sync(),
    Value = require('../../src/Value').sync();

describe('Environment', function () {
    beforeEach(function () {
        this.state = sinon.createStubInstance(PHPState);
        this.options = {};

        this.environment = new Environment(this.state, this.options);
    });

    describe('defineSuperGlobal()', function () {
        it('should define the super global on the state', function () {
            var value = sinon.createStubInstance(Value);
            this.environment.defineSuperGlobal('myGlobal', value);

            expect(this.state.defineSuperGlobal).to.have.been.calledOnce;
            expect(this.state.defineSuperGlobal).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(value)
            );
        });
    });

    describe('defineSuperGlobalAccessor()', function () {
        it('should define the super global on the state', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            this.environment.defineSuperGlobalAccessor('myGlobal', valueGetter, valueSetter);

            expect(this.state.defineSuperGlobalAccessor).to.have.been.calledOnce;
            expect(this.state.defineSuperGlobalAccessor).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter)
            );
        });
    });

    describe('getConstant()', function () {
        it('should return the constant from the state', function () {
            this.state.getConstant.withArgs('MY_CONST').returns(21);

            expect(this.environment.getConstant('MY_CONST')).to.equal(21);
        });
    });
});
