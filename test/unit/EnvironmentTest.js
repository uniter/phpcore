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

        this.environment = new Environment(this.state);
    });

    describe('defineClass()', function () {
        it('should define the class on the state', function () {
            var definitionFactory = sinon.stub();

            this.environment.defineClass('My\\Namespaced\\CoolClass', definitionFactory);

            expect(this.state.defineClass).to.have.been.calledOnce;
            expect(this.state.defineClass).to.have.been.calledWith(
                'My\\Namespaced\\CoolClass',
                sinon.match.same(definitionFactory)
            );
        });
    });

    describe('defineCoercingFunction()', function () {
        it('should define the function on the state', function () {
            var myFunction = sinon.stub();

            this.environment.defineCoercingFunction('my_func', myFunction);

            expect(this.state.defineCoercingFunction).to.have.been.calledOnce;
            expect(this.state.defineCoercingFunction).to.have.been.calledWith(
                'my_func',
                sinon.match.same(myFunction)
            );
        });
    });

    describe('defineGlobal()', function () {
        it('should define the global on the state', function () {
            var value = sinon.createStubInstance(Value);
            this.environment.defineGlobal('myGlobal', value);

            expect(this.state.defineGlobal).to.have.been.calledOnce;
            expect(this.state.defineGlobal).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(value)
            );
        });
    });

    describe('defineGlobalAccessor()', function () {
        it('should define the global on the state', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            this.environment.defineGlobalAccessor('myGlobal', valueGetter, valueSetter);

            expect(this.state.defineGlobalAccessor).to.have.been.calledOnce;
            expect(this.state.defineGlobalAccessor).to.have.been.calledWith(
                'myGlobal',
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter)
            );
        });
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

    describe('getOptions()', function () {
        it('should return the raw options object from the PHPState', function () {
            var options = {'my-option': 27};

            this.state.getOptions.returns(options);

            expect(this.environment.getOptions()).to.deep.equal(options);
        });
    });
});
