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
    FutureFactory = require('../../src/Control/FutureFactory'),
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    ValueFactory = require('../../src/ValueFactory').sync(),
    VariableFactory = require('../../src/VariableFactory').sync();

describe('VariableFactory', function () {
    var callStack,
        factory,
        futureFactory,
        referenceFactory,
        valueFactory,
        Variable;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        futureFactory = sinon.createStubInstance(FutureFactory);
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        valueFactory = sinon.createStubInstance(ValueFactory);
        Variable = sinon.stub();

        factory = new VariableFactory(
            Variable,
            callStack,
            valueFactory,
            referenceFactory,
            futureFactory
        );
    });

    describe('createVariable()', function () {
        it('should create the Variable correctly', function () {
            factory.createVariable('myVar');

            expect(Variable).to.have.been.calledOnce;
            expect(Variable).to.have.been.calledWith(
                sinon.match.same(callStack),
                sinon.match.same(valueFactory),
                sinon.match.same(referenceFactory),
                sinon.match.same(futureFactory),
                'myVar'
            );
        });

        it('should return the created Variable', function () {
            var variable = sinon.createStubInstance(Variable);
            Variable.returns(variable);

            expect(factory.createVariable('myVar')).to.equal(variable);
        });
    });
});
