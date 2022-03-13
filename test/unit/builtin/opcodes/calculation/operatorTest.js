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
    var internals,
        opcodeGroup,
        sourceReference,
        state,
        targetReference,
        valueFactory;

    beforeEach(function () {
        internals = {
            setOpcodeFetcher: sinon.stub()
        };
        sourceReference = new Variable();
        targetReference = new Variable();
        state = tools.createIsolatedState();
        valueFactory = state.getValueFactory();

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

        it('should append the source value to the target value and assign it back to the target', function () {
            targetReference.setValue(valueFactory.createString('value for my target'));
            sourceReference.setValue(valueFactory.createString(' with world on the end'));

            concatWith(targetReference, sourceReference);

            expect(targetReference.getNative()).to.equal('value for my target with world on the end');
            expect(sourceReference.getNative()).to.equal(' with world on the end'); // Should be left untouched.
        });
    });

    describe('decrementBy()', function () {
        var decrementBy;

        beforeEach(function () {
            decrementBy = opcodeGroup.decrementBy;
        });

        it('should subtract the source value from the target value and assign it back to the target', function () {
            targetReference.setValue(valueFactory.createInteger(100));
            sourceReference.setValue(valueFactory.createInteger(20));

            decrementBy(targetReference, sourceReference);

            expect(targetReference.getNative()).to.equal(80);
            expect(sourceReference.getNative()).to.equal(20); // Should be left untouched.
        });
    });

    describe('divideBy()', function () {
        var divideBy;

        beforeEach(function () {
            divideBy = opcodeGroup.divideBy;
        });

        it('should divide the target value by the source value and assign it back to the target', function () {
            targetReference.setValue(valueFactory.createInteger(100));
            sourceReference.setValue(valueFactory.createInteger(20));

            divideBy(targetReference, sourceReference);

            expect(targetReference.getNative()).to.equal(5);
            expect(sourceReference.getNative()).to.equal(20); // Should be left untouched.
        });
    });

    describe('incrementBy()', function () {
        var incrementBy;

        beforeEach(function () {
            incrementBy = opcodeGroup.incrementBy;
        });

        it('should add the target value to the source value and assign it back to the target', function () {
            targetReference.setValue(valueFactory.createInteger(10));
            sourceReference.setValue(valueFactory.createInteger(5));

            incrementBy(targetReference, sourceReference);

            expect(targetReference.getNative()).to.equal(15);
            expect(sourceReference.getNative()).to.equal(5); // Should be left untouched.
        });
    });

    describe('multiplyBy()', function () {
        var multiplyBy;

        beforeEach(function () {
            multiplyBy = opcodeGroup.multiplyBy;
        });

        it('should multiply the target value by the source value and assign it back to the target', function () {
            targetReference.setValue(valueFactory.createInteger(10));
            sourceReference.setValue(valueFactory.createFloat(1.5));

            multiplyBy(targetReference, sourceReference);

            expect(targetReference.getNative()).to.equal(15);
            expect(sourceReference.getNative()).to.equal(1.5); // Should be left untouched.
        });
    });

    describe('postDecrement()', function () {
        var postDecrement;

        beforeEach(function () {
            postDecrement = opcodeGroup.postDecrement;
        });

        it('should decrement the target value and assign it back to the target', function () {
            targetReference.setValue(valueFactory.createInteger(10));

            postDecrement(targetReference);

            expect(targetReference.getNative()).to.equal(9);
        });

        it('should return the original value', function () {
            var resultValue = this;
            targetReference.setValue(valueFactory.createInteger(10));

            resultValue = postDecrement(targetReference);

            expect(resultValue.getNative()).to.equal(10);
        });
    });

    describe('postIncrement()', function () {
        var postIncrement;

        beforeEach(function () {
            postIncrement = opcodeGroup.postIncrement;
        });

        it('should increment the target value and assign it back to the target', function () {
            targetReference.setValue(valueFactory.createInteger(10));

            postIncrement(targetReference);

            expect(targetReference.getNative()).to.equal(11);
        });

        it('should return the original value', function () {
            var resultValue = this;
            targetReference.setValue(valueFactory.createInteger(10));

            resultValue = postIncrement(targetReference);

            expect(resultValue.getNative()).to.equal(10);
        });
    });

    describe('preDecrement()', function () {
        var preDecrement;

        beforeEach(function () {
            preDecrement = opcodeGroup.preDecrement;
        });

        it('should decrement the target value and assign it back to the target', function () {
            targetReference.setValue(valueFactory.createInteger(10));

            preDecrement(targetReference);

            expect(targetReference.getNative()).to.equal(9);
        });

        it('should return the decremented value', function () {
            var resultValue = this;
            targetReference.setValue(valueFactory.createInteger(10));

            resultValue = preDecrement(targetReference);

            expect(resultValue.getNative()).to.equal(9);
        });
    });

    describe('preIncrement()', function () {
        var preIncrement;

        beforeEach(function () {
            preIncrement = opcodeGroup.preIncrement;
        });

        it('should increment the target value and assign it back to the target', function () {
            targetReference.setValue(valueFactory.createInteger(10));

            preIncrement(targetReference);

            expect(targetReference.getNative()).to.equal(11);
        });

        it('should return the incremented value', function () {
            var resultValue = this;
            targetReference.setValue(valueFactory.createInteger(10));

            resultValue = preIncrement(targetReference);

            expect(resultValue.getNative()).to.equal(11);
        });
    });
});
