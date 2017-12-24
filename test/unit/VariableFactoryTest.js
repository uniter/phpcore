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
    CallStack = require('../../src/CallStack'),
    ValueFactory = require('../../src/ValueFactory').sync(),
    VariableFactory = require('../../src/VariableFactory').sync();

describe('VariableFactory', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.valueFactory = sinon.createStubInstance(ValueFactory);
        this.Variable = sinon.stub();

        this.factory = new VariableFactory(
            this.Variable,
            this.callStack,
            this.valueFactory
        );
    });

    describe('createVariable()', function () {
        beforeEach(function () {
            this.variable = sinon.createStubInstance(this.Variable);
        });

        it('should create the Variable correctly', function () {
            this.factory.createVariable('myVar');

            expect(this.Variable).to.have.been.calledOnce;
            expect(this.Variable).to.have.been.calledWith(
                sinon.match.same(this.callStack),
                sinon.match.same(this.valueFactory),
                'myVar'
            );
        });

        it('should return the created Variable', function () {
            var variable = sinon.createStubInstance(this.Variable);
            this.Variable.returns(variable);

            expect(this.factory.createVariable('myVar')).to.equal(variable);
        });
    });
});
