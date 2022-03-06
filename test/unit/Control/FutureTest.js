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
    FutureFactory = require('../../../src/Control/FutureFactory'),
    Future = require('../../../src/Control/Future'),
    PauseFactory = require('../../../src/Control/PauseFactory'),
    Sequence = require('../../../src/Control/Sequence'),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Future', function () {
    var future,
        futureFactory,
        pauseFactory,
        sequence,
        valueFactory;

    beforeEach(function () {
        futureFactory = sinon.createStubInstance(FutureFactory);
        pauseFactory = sinon.createStubInstance(PauseFactory);
        sequence = sinon.createStubInstance(Sequence);
        valueFactory = sinon.createStubInstance(ValueFactory);

        future = new Future(futureFactory, pauseFactory, valueFactory, sequence);
    });

    describe('isCompleted()', function () {
        it('should return true when the Sequence is completed', function () {
            sequence.isCompleted.returns(true);

            expect(future.isCompleted()).to.be.true;
        });

        it('should return false when the Sequence is incomplete', function () {
            sequence.isCompleted.returns(false);

            expect(future.isCompleted()).to.be.false;
        });
    });

    describe('isPending()', function () {
        it('should return true when the Sequence is incomplete', function () {
            sequence.isCompleted.returns(false);

            expect(future.isPending()).to.be.true;
        });

        it('should return false when the Sequence is completed', function () {
            sequence.isCompleted.returns(true);

            expect(future.isPending()).to.be.false;
        });
    });
});
