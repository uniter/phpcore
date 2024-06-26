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
    CacheInvalidator = require('../../src/Garbage/CacheInvalidator'),
    CallStack = require('../../src/CallStack'),
    Flow = require('../../src/Control/Flow'),
    FutureFactory = require('../../src/Control/FutureFactory'),
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    ValueFactory = require('../../src/ValueFactory').sync(),
    VariableFactory = require('../../src/VariableFactory').sync();

describe('VariableFactory', function () {
    var callStack,
        factory,
        flow,
        futureFactory,
        garbageCacheInvalidator,
        referenceFactory,
        valueFactory,
        Variable;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        flow = sinon.createStubInstance(Flow);
        futureFactory = sinon.createStubInstance(FutureFactory);
        garbageCacheInvalidator = sinon.createStubInstance(CacheInvalidator);
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        valueFactory = sinon.createStubInstance(ValueFactory);
        Variable = sinon.stub();

        factory = new VariableFactory(
            Variable,
            callStack,
            valueFactory,
            referenceFactory,
            futureFactory,
            flow,
            garbageCacheInvalidator
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
                sinon.match.same(flow),
                sinon.match.same(garbageCacheInvalidator),
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
