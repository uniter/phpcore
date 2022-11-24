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
    tools = require('../../tools'),
    ArrayChainifier = require('../../../../src/Control/Chain/ArrayChainifier'),
    Chainifier = require('../../../../src/Control/Chain/Chainifier'),
    FFIResult = require('../../../../src/FFI/Result'),
    Future = require('../../../../src/Control/Future');

describe('Chainifier', function () {
    var arrayChainifier,
        chainifier,
        controlBridge,
        futureFactory,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        controlBridge = state.getControlBridge();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();
        arrayChainifier = sinon.createStubInstance(ArrayChainifier);

        chainifier = new Chainifier(futureFactory, controlBridge);
        chainifier.setArrayChainifier(arrayChainifier);
    });

    describe('chainify()', function () {
        it('should return a Future untouched', function () {
            var future = futureFactory.createPresent(21);

            expect(chainifier.chainify(future)).to.equal(future);
        });

        it('should return a Value untouched', function () {
            var value = valueFactory.createString('my chainable');

            expect(chainifier.chainify(value)).to.equal(value);
        });

        it('should resolve an FFIResult', function () {
            var ffiResult = sinon.createStubInstance(FFIResult),
                future = futureFactory.createPresent('my resolved result');
            ffiResult.resolve.returns(future);

            expect(chainifier.chainify(ffiResult)).to.equal(future);
        });

        it('should chainify arrays via ArrayChainifier', function () {
            var array = ['my', 'array'],
                chainifiedArray = ['my', 'chainified', 'array'];
            arrayChainifier.chainify
                .withArgs(array)
                .returns(chainifiedArray);

            expect(chainifier.chainify(array)).to.equal(chainifiedArray);
        });

        it('should wrap other native values in a Future', async function () {
            var future = chainifier.chainify('my string');

            expect(future).to.be.an.instanceOf(Future);
            expect(await future.toPromise()).to.equal('my string');
        });
    });
});
