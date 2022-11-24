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
    Future = require('../../../../src/Control/Future');

describe('ArrayChainifier', function () {
    var array,
        arrayChainifier,
        chainifier,
        futureFactory,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        chainifier = sinon.createStubInstance(Chainifier);
        array = ['my', 'array'];

        arrayChainifier = new ArrayChainifier(valueFactory, futureFactory, chainifier);
    });

    describe('chainify()', function () {
        it('should add the expected methods to the array', function () {
            var chainifiedArray = arrayChainifier.chainify(array);

            expect(chainifiedArray).to.respondTo('asValue');
            expect(chainifiedArray).to.respondTo('isFuture');
            expect(chainifiedArray).to.respondTo('next');
            expect(chainifiedArray).to.respondTo('yieldSync');
        });

        describe('.asValue() method added', function () {
            it('should return an ArrayValue', function () {
                var chainifiedArray = arrayChainifier.chainify(array),
                    arrayValue = chainifiedArray.asValue();

                expect(arrayValue.getType()).to.equal('array');
                expect(arrayValue.getNative()).to.deep.equal(['my', 'array']);
            });

            it('should be non-enumerable', function () {
                var chainifiedArray = arrayChainifier.chainify(array),
                    methodDescriptor = Object.getOwnPropertyDescriptor(chainifiedArray, 'asValue');

                expect(methodDescriptor.enumerable).to.be.false;
            });
        });

        describe('.isFuture() method added', function () {
            it('should return false', function () {
                var chainifiedArray = arrayChainifier.chainify(array);

                expect(chainifiedArray.isFuture()).to.be.false;
            });

            it('should be non-enumerable', function () {
                var chainifiedArray = arrayChainifier.chainify(array),
                    methodDescriptor = Object.getOwnPropertyDescriptor(chainifiedArray, 'isFuture');

                expect(methodDescriptor.enumerable).to.be.false;
            });
        });

        describe('.next() method added', function () {
            var callChainify,
                chainifiedArray;

            beforeEach(function () {
                chainifiedArray = null;

                callChainify = function () {
                    chainifiedArray = arrayChainifier.chainify(array);
                };
            });

            it('should just return the value when no callback given', function () {
                callChainify();

                expect(chainifiedArray.next()).to.equal(chainifiedArray);
            });

            it('should invoke the callback with the value and return the coerced result', function () {
                var callback = sinon.stub(),
                    resultValue;
                callChainify();
                callback.withArgs(sinon.match.same(chainifiedArray))
                    .returns('my result');
                chainifier.chainify
                    .withArgs('my result')
                    .returns(valueFactory.createString('my result'));

                resultValue = chainifiedArray.next(callback);

                expect(resultValue.getType()).to.equal('string');
                expect(resultValue.getNative()).to.equal('my result');
            });

            it('should return a rejected Future when the callback raises an error', async function () {
                var callback = sinon.stub(),
                    resultValue;
                callChainify();
                callback.withArgs(sinon.match.same(chainifiedArray))
                    .throws(new Error('Bang!'));

                resultValue = chainifiedArray.next(callback);

                expect(resultValue).to.be.an.instanceOf(Future);
                await expect(resultValue.toPromise()).to.eventually.be.rejectedWith('Bang!');
            });

            it('should be non-enumerable', function () {
                var chainifiedArray = arrayChainifier.chainify(array),
                    methodDescriptor = Object.getOwnPropertyDescriptor(chainifiedArray, 'next');

                expect(methodDescriptor.enumerable).to.be.false;
            });
        });

        describe('.yieldSync() method added', function () {
            it('should return the array itself', function () {
                var chainifiedArray = arrayChainifier.chainify(['my', 'array']);

                expect(chainifiedArray.yieldSync()).to.equal(chainifiedArray);
            });

            it('should be non-enumerable', function () {
                var chainifiedArray = arrayChainifier.chainify(array),
                    methodDescriptor = Object.getOwnPropertyDescriptor(chainifiedArray, 'yieldSync');

                expect(methodDescriptor.enumerable).to.be.false;
            });
        });
    });
});
