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
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('ReferenceFactory', function () {
    beforeEach(function () {
        this.AccessorReference = sinon.stub();
        this.NullReference = sinon.stub();
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.factory = new ReferenceFactory(
            this.AccessorReference,
            this.NullReference,
            this.valueFactory
        );
    });

    describe('createAccessor()', function () {
        beforeEach(function () {
            this.valueGetter = sinon.stub();
            this.valueSetter = sinon.stub();
        });

        it('should create the AccessorReference correctly', function () {
            this.factory.createAccessor(this.valueGetter, this.valueSetter);

            expect(this.AccessorReference).to.have.been.calledOnce;
            expect(this.AccessorReference).to.have.been.calledWith(
                sinon.match.same(this.valueFactory),
                sinon.match.same(this.valueGetter),
                sinon.match.same(this.valueSetter)
            );
        });

        it('should return the created AccessorReference', function () {
            var reference = sinon.createStubInstance(this.AccessorReference);
            this.AccessorReference.returns(reference);

            expect(
                this.factory.createAccessor(this.valueGetter, this.valueSetter)
            ).to.equal(reference);
        });
    });

    describe('createNull()', function () {
        it('should create the NullReference correctly', function () {
            this.factory.createNull();

            expect(this.NullReference).to.have.been.calledOnce;
            expect(this.NullReference).to.have.been.calledWith(
                sinon.match.same(this.valueFactory)
            );
        });

        it('should return the created NullReference', function () {
            var reference = sinon.createStubInstance(this.NullReference);
            this.NullReference.returns(reference);

            expect(this.factory.createNull()).to.equal(reference);
        });
    });
});
