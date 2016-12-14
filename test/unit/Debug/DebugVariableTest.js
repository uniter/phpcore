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
    DebugVariable = require('../../../src/Debug/DebugVariable'),
    Scope = require('../../../src/Scope').sync(),
    Value = require('../../../src/Value').sync(),
    Variable = require('../../../src/Variable').sync();

describe('DebugVariable', function () {
    beforeEach(function () {
        this.scope = sinon.createStubInstance(Scope);
        this.value = sinon.createStubInstance(Value);
        this.variable = sinon.createStubInstance(Variable);

        this.variable.getValue.returns(this.value);
        this.scope.getVariable.withArgs('myVar').returns(this.variable);

        this.debugValue = new DebugVariable(this.scope, 'myVar');
    });

    describe('getValue()', function () {
        it('should return the value of the variable from its scope', function () {
            expect(this.debugValue.getValue()).to.equal(this.value);
        });
    });

    describe('isDefined()', function () {
        it('should return true when the variable is defined', function () {
            this.variable.isDefined.returns(true);

            expect(this.debugValue.isDefined()).to.be.true;
        });

        it('should return false when the variable is not defined', function () {
            this.variable.isDefined.returns(false);

            expect(this.debugValue.isDefined()).to.be.false;
        });
    });
});
