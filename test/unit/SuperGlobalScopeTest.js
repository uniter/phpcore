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
    ValueFactory = require('../../src/ValueFactory').sync(),
    Variable = require('../../src/Variable').sync();

describe('SuperGlobalScope', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.scope = new SuperGlobalScope(this.callStack, this.valueFactory);
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
