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
    SuperGlobalScope = require('../../src/SuperGlobalScope').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync(),
    Variable = require('../../src/Variable').sync();

describe('SuperGlobalScope', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.scope = new SuperGlobalScope(this.callStack, this.valueFactory);
    });

    describe('exportVariables()', function () {
        it('should export all defined variables except $GLOBALS', function () {
            var superGlobalValue1 = sinon.createStubInstance(Value),
                superGlobalValue2 = sinon.createStubInstance(Value),
                globalsSuperGlobalValue = sinon.createStubInstance(Value),
                variables;
            superGlobalValue1.getForAssignment.returns(superGlobalValue1);
            superGlobalValue2.getForAssignment.returns(superGlobalValue2);
            globalsSuperGlobalValue.getForAssignment.returns(globalsSuperGlobalValue);
            this.scope.defineVariable('superGlobal1').setValue(superGlobalValue1);
            this.scope.defineVariable('superGlobal2').setValue(superGlobalValue2);
            this.scope.defineVariable('GLOBALS').setValue(globalsSuperGlobalValue);

            variables = this.scope.exportVariables();

            expect(variables.superGlobal1).to.equal(superGlobalValue1);
            expect(variables.superGlobal2).to.equal(superGlobalValue2);
            expect(variables).not.to.have.property('GLOBALS');
        });
    });

    describe('getVariable()', function () {
        it('should fetch the existing variable if already defined', function () {
            var variable,
                fetchedVariable;
            variable = this.scope.defineVariable('mySuperGlobalVar');

            fetchedVariable = this.scope.getVariable('mySuperGlobalVar');

            expect(fetchedVariable).to.be.an.instanceOf(Variable);
            expect(fetchedVariable).to.equal(variable);
        });

        it('should return null if not defined', function () {
            expect(this.scope.getVariable('myUndefinedVar')).to.be.null;
        });
    });
});
