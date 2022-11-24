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
    var debugValue,
        scope,
        value,
        variable;

    beforeEach(function () {
        scope = sinon.createStubInstance(Scope);
        value = sinon.createStubInstance(Value);
        variable = sinon.createStubInstance(Variable);

        variable.getValue.returns(value);
        scope.getVariable.withArgs('myVar').returns(variable);

        debugValue = new DebugVariable(scope, 'myVar');
    });

    describe('getValue()', function () {
        it('should return the value of the variable from its scope', function () {
            expect(debugValue.getValue()).to.equal(value);
        });
    });

    describe('isDefined()', function () {
        it('should return true when the variable is defined', function () {
            variable.isDefined.returns(true);

            expect(debugValue.isDefined()).to.be.true;
        });

        it('should return false when the variable is not defined', function () {
            variable.isDefined.returns(false);

            expect(debugValue.isDefined()).to.be.false;
        });
    });
});
