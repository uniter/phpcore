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
    tools = require('../tools'),
    Variable = require('../../../src/Variable').sync();

describe('ValueProvider', function () {
    var factory,
        futureFactory,
        state,
        valueFactory,
        valueProvider;

    beforeEach(function () {
        state = tools.createIsolatedState();
        factory = state.getValueFactory();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        valueProvider = state.getValueProvider();
    });

    describe('createFutureList()', function () {
        it('should return present values unchanged', async function () {
            var list,
                value1 = valueFactory.createString('first value'),
                value2 = valueFactory.createString('second value'),
                value3 = valueFactory.createString('third value');

            list = await valueProvider.createFutureList([value1, value2, value3]).toPromise();

            expect(list[0].getNative()).to.equal('first value');
            expect(list[1].getNative()).to.equal('second value');
            expect(list[2].getNative()).to.equal('third value');
        });

        it('should settle any FutureValue that is to be fulfilled', async function () {
            var list,
                value1 = valueFactory.createString('first value'),
                value2 = valueFactory.createAsyncPresent('second value'),
                value3 = valueFactory.createString('third value');

            list = await valueProvider.createFutureList([value1, value2, value3]).toPromise();

            expect(list[0].getNative()).to.equal('first value');
            expect(list[1].getNative()).to.equal('second value');
            expect(list[2].getNative()).to.equal('third value');
        });

        it('should settle any FutureValue that is to be rejected', async function () {
            var value1 = valueFactory.createString('first value'),
                value2 = valueFactory.createAsyncRejection(new Error('Bang!')),
                value3 = valueFactory.createString('third value');

            await expect(valueProvider.createFutureList([value1, value2, value3]).toPromise())
                .to.eventually.be.rejectedWith('Bang!');
        });

        it('should settle any Future-wrapped Variable whose value is to be fulfilled', async function () {
            var list,
                variable = sinon.createStubInstance(Variable),
                value1 = valueFactory.createString('first value'),
                value2 = futureFactory.createAsyncPresent(variable),
                value3 = valueFactory.createString('third value');
            variable.getValue.returns(valueFactory.createAsyncPresent('second value'));

            list = await valueProvider.createFutureList([value1, value2, value3]).toPromise();

            expect(list[0].getNative()).to.equal('first value');
            expect(list[1].getNative()).to.equal('second value');
            expect(list[2].getNative()).to.equal('third value');
        });
    });
});
