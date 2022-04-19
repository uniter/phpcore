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
    tools = require('./tools'),
    List = require('../../src/List'),
    Reference = require('../../src/Reference/Reference');

describe('List', function () {
    var elements,
        flow,
        list,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        flow = state.getFlow();
        valueFactory = state.getValueFactory();
        elements = [];

        list = new List(valueFactory, flow, elements);
    });

    describe('setValue()', function () {
        it('should return the value assigned', async function () {
            var value = valueFactory.createArray([21, 101]),
                resultValue = await list.setValue(value).toPromise();

            expect(resultValue.getNative()).to.deep.equal([21, 101]);
        });

        it('should assign elements to references when an array is assigned', async function () {
            var listElement1 = sinon.createStubInstance(Reference),
                listElement2 = sinon.createStubInstance(Reference),
                assignedValue;
            elements.push(listElement1);
            elements.push(listElement2);
            assignedValue = valueFactory.createArray([21, 101]);

            await list.setValue(assignedValue).toPromise();

            expect(listElement1.setValue).to.have.been.calledOnce;
            expect(listElement1.setValue.args[0][0].getType()).to.equal('int');
            expect(listElement1.setValue.args[0][0].getNative()).to.equal(21);
            expect(listElement2.setValue).to.have.been.calledOnce;
            expect(listElement2.setValue.args[0][0].getType()).to.equal('int');
            expect(listElement2.setValue.args[0][0].getNative()).to.equal(101);
        });

        it('should assign null to all references when an integer is assigned', async function () {
            var listElement1 = sinon.createStubInstance(Reference),
                listElement2 = sinon.createStubInstance(Reference),
                assignedValue;
            elements.push(listElement1);
            elements.push(listElement2);
            assignedValue = valueFactory.createInteger(1234);

            await list.setValue(assignedValue).toPromise();

            expect(listElement1.setValue).to.have.been.calledOnce;
            expect(listElement1.setValue.args[0][0].getType()).to.equal('null');
            expect(listElement2.setValue).to.have.been.calledOnce;
            expect(listElement2.setValue.args[0][0].getType()).to.equal('null');
        });
    });
});
