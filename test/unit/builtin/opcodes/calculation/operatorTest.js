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
    calculationOpcodeGroup = require('../../../../../src/builtin/opcodes/calculation'),
    sinon = require('sinon'),
    tools = require('../../../tools'),
    Variable = require('../../../../../src/Variable').sync();

describe('PHP operator opcode handlers', function () {
    var hostScheduler,
        internals,
        opcodeGroup,
        referenceFactory,
        sourceReference,
        state,
        targetReference,
        targetReferenceValue,
        valueFactory;

    beforeEach(function () {
        internals = {
            setOpcodeFetcher: sinon.stub()
        };
        state = tools.createIsolatedState();
        hostScheduler = state.getHostScheduler();
        referenceFactory = state.getReferenceFactory();
        valueFactory = state.getValueFactory();

        sourceReference = new Variable();

        targetReferenceValue = valueFactory.createNull();
        targetReference = referenceFactory.createAccessor(
            function () {
                return valueFactory.createAsyncPresent(targetReferenceValue);
            },
            function (newValue) {
                return valueFactory.createFuture(function (resolve) {
                    // Defer in a macrotask to ensure we are correctly awaiting setter-returned Future(Value)s.
                    hostScheduler.queueMacrotask(function () {
                        targetReferenceValue = newValue;
                        resolve();
                    });
                });
            }
        );

        opcodeGroup = calculationOpcodeGroup(internals);
    });

    it('should use the calculation opcode fetcher', function () {
        expect(internals.setOpcodeFetcher).to.have.been.calledOnce;
        expect(internals.setOpcodeFetcher).to.have.been.calledWith('calculation');
    });

    describe('concatWith()', function () {
        var concatWith;

        beforeEach(function () {
            concatWith = opcodeGroup.concatWith;
        });

        it('should append the source value to the target value and assign it back to the target', async function () {
            await targetReference.setValue(valueFactory.createString('value for my target')).toPromise();
            await sourceReference.setValue(valueFactory.createString(' with world on the end')).toPromise();

            await concatWith(targetReference, sourceReference).toPromise();

            expect(await targetReference.asEventualNative().toPromise()).to.equal('value for my target with world on the end');
            expect(await sourceReference.asEventualNative().toPromise()).to.equal(' with world on the end'); // Should be left untouched.
        });
    });

    describe('decrementBy()', function () {
        var decrementBy;

        beforeEach(function () {
            decrementBy = opcodeGroup.decrementBy;
        });

        it('should subtract the source value from the target value and assign it back to the target', async function () {
            await targetReference.setValue(valueFactory.createInteger(100)).toPromise();
            await sourceReference.setValue(valueFactory.createInteger(20)).toPromise();

            await decrementBy(targetReference, sourceReference).toPromise();

            expect(await targetReference.asEventualNative().toPromise()).to.equal(80);
            expect(await sourceReference.asEventualNative().toPromise()).to.equal(20); // Should be left untouched.
        });
    });

    describe('divideBy()', function () {
        var divideBy;

        beforeEach(function () {
            divideBy = opcodeGroup.divideBy;
        });

        it('should divide the target value by the source value and assign it back to the target', async function () {
            await targetReference.setValue(valueFactory.createInteger(100)).toPromise();
            await sourceReference.setValue(valueFactory.createInteger(20)).toPromise();

            await divideBy(targetReference, sourceReference).toPromise();

            expect(await targetReference.asEventualNative().toPromise()).to.equal(5);
            expect(await sourceReference.asEventualNative().toPromise()).to.equal(20); // Should be left untouched.
        });
    });

    describe('incrementBy()', function () {
        var incrementBy;

        beforeEach(function () {
            incrementBy = opcodeGroup.incrementBy;
        });

        it('should add the target value to the source value and assign it back to the target', async function () {
            await targetReference.setValue(valueFactory.createInteger(10)).toPromise();
            await sourceReference.setValue(valueFactory.createInteger(5)).toPromise();

            await incrementBy(targetReference, sourceReference).toPromise();

            expect(await targetReference.asEventualNative().toPromise()).to.equal(15);
            expect(await sourceReference.asEventualNative().toPromise()).to.equal(5); // Should be left untouched.
        });
    });

    describe('multiplyBy()', function () {
        var multiplyBy;

        beforeEach(function () {
            multiplyBy = opcodeGroup.multiplyBy;
        });

        it('should multiply the target value by the source value and assign it back to the target', async function () {
            await targetReference.setValue(valueFactory.createInteger(10)).toPromise();
            await sourceReference.setValue(valueFactory.createFloat(1.5)).toPromise();

            await multiplyBy(targetReference, sourceReference).toPromise();

            expect(await targetReference.asEventualNative().toPromise()).to.equal(15);
            expect(await sourceReference.asEventualNative().toPromise()).to.equal(1.5); // Should be left untouched.
        });
    });

    describe('postDecrement()', function () {
        var postDecrement;

        beforeEach(function () {
            postDecrement = opcodeGroup.postDecrement;
        });

        it('should decrement the target value and assign it back to the target', async function () {
            await targetReference.setValue(valueFactory.createInteger(10)).toPromise();

            await postDecrement(targetReference).toPromise();

            expect(await targetReference.asEventualNative().toPromise()).to.equal(9);
        });

        it('should return the original value', async function () {
            var resultValue;
            await targetReference.setValue(valueFactory.createInteger(10)).toPromise();

            resultValue = await postDecrement(targetReference).toPromise();

            expect(await resultValue.asEventualNative().toPromise()).to.equal(10);
        });
    });

    describe('postIncrement()', function () {
        var postIncrement;

        beforeEach(function () {
            postIncrement = opcodeGroup.postIncrement;
        });

        it('should increment the target value and assign it back to the target', async function () {
            await targetReference.setValue(valueFactory.createInteger(10)).toPromise();

            await postIncrement(targetReference).toPromise();

            expect(await targetReference.asEventualNative().toPromise()).to.equal(11);
        });

        it('should return the original value', async function () {
            var resultValue;
            await targetReference.setValue(valueFactory.createInteger(10)).toPromise();

            resultValue = await postIncrement(targetReference).toPromise();

            expect(await resultValue.asEventualNative().toPromise()).to.equal(10);
        });
    });

    describe('preDecrement()', function () {
        var preDecrement;

        beforeEach(function () {
            preDecrement = opcodeGroup.preDecrement;
        });

        it('should decrement the target value and assign it back to the target', async function () {
            await targetReference.setValue(valueFactory.createInteger(10)).toPromise();

            await preDecrement(targetReference).toPromise();

            expect(await targetReference.asEventualNative().toPromise()).to.equal(9);
        });

        it('should return the decremented value', async function () {
            var resultValue;
            await targetReference.setValue(valueFactory.createInteger(10)).toPromise();

            resultValue = await preDecrement(targetReference).toPromise();

            expect(await resultValue.asEventualNative().toPromise()).to.equal(9);
        });
    });

    describe('preIncrement()', function () {
        var preIncrement;

        beforeEach(function () {
            preIncrement = opcodeGroup.preIncrement;
        });

        it('should increment the target value and assign it back to the target', async function () {
            await targetReference.setValue(valueFactory.createInteger(10)).toPromise();

            await preIncrement(targetReference).toPromise();

            expect(await targetReference.asEventualNative().toPromise()).to.equal(11);
        });

        it('should return the incremented value', async function () {
            var resultValue;
            await targetReference.setValue(valueFactory.createInteger(10)).toPromise();

            resultValue = await preIncrement(targetReference).toPromise();

            expect(await resultValue.asEventualNative().toPromise()).to.equal(11);
        });
    });
});
