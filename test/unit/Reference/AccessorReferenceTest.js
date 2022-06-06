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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    tools = require('../tools'),
    AccessorReference = require('../../../src/Reference/AccessorReference'),
    Exception = phpCommon.Exception,
    Reference = require('../../../src/Reference/Reference');

describe('AccessorReference', function () {
    var futureFactory,
        reference,
        referenceFactory,
        referenceSetter,
        state,
        valueFactory,
        valueGetter,
        valueSetter;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        referenceFactory = state.getReferenceFactory();
        referenceSetter = sinon.spy();
        valueFactory = state.getValueFactory();
        valueGetter = sinon.stub();
        valueSetter = sinon.spy();

        reference = new AccessorReference(
            valueFactory,
            referenceFactory,
            valueGetter,
            valueSetter,
            referenceSetter
        );
    });

    describe('asArrayElement()', function () {
        it('should return the result of the getter coerced to a PHP value', function () {
            var value;
            valueGetter.returns(101);

            value = reference.asArrayElement();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(101);
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to the native value returned by the getter', async function () {
            valueGetter.returns(101);

            expect(await reference.asEventualNative().toPromise()).to.equal(101);
        });
    });

    describe('formatAsString()', function () {
        it('should return the native result of the getter, formatted', function () {
            valueGetter.returns('My native result');

            expect(reference.formatAsString()).to.equal('\'My native resul...\'');
        });
    });

    describe('getNative()', function () {
        it('should return result of the getter coerced to a PHP value', function () {
            valueGetter.returns(21);

            expect(reference.getNative()).to.equal(21);
        });
    });

    describe('getValue()', function () {
        it('should return the result of the getter coerced to a PHP value', function () {
            var value;
            valueGetter.returns(101);

            value = reference.getValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(101);
        });
    });

    describe('getValueOrNull()', function () {
        it('should return the value when the getter returns a value', function () {
            var value = valueFactory.createString('my value');
            valueGetter.returns(value);

            expect(reference.getValueOrNull()).to.equal(value);
        });

        it('should return a NullValue when the getter returns no value', function () {
            expect(reference.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('hasReferenceSetter()', function () {
        it('should return true when a reference setter was given', function () {
            expect(reference.hasReferenceSetter()).to.be.true;
        });

        it('should return false when a reference setter was not given', function () {
            reference = new AccessorReference(
                valueFactory,
                referenceFactory,
                valueGetter,
                valueSetter,
                null
            );

            expect(reference.hasReferenceSetter()).to.be.false;
        });
    });

    describe('isDefined()', function () {
        it('should return true', function () {
            expect(reference.isDefined()).to.be.true;
        });
    });

    describe('isEmpty()', function () {
        it('should return true when the getter\'s result resolves to an empty value', async function () {
            valueGetter.returns(valueFactory.createPresent(valueFactory.createArray([])));

            expect(await reference.isEmpty().toPromise()).to.be.true;
        });

        it('should return false when the getter\'s result resolves to a non-empty value', async function () {
            valueGetter.returns(valueFactory.createPresent(21));

            expect(await reference.isEmpty().toPromise()).to.be.false;
        });
    });

    describe('isReferenceable()', function () {
        it('should return true', function () {
            expect(reference.isReferenceable()).to.be.true;
        });
    });

    describe('isSet()', function () {
        it('should return true when the getter\'s result resolves to a set value', async function () {
            valueGetter.returns(valueFactory.createPresent(true));

            expect(await reference.isSet().toPromise()).to.be.true;
        });

        it('should return false when the getter\'s result resolves to an unset value', async function () {
            valueGetter.returns(valueFactory.createPresent(null));

            expect(await reference.isSet().toPromise()).to.be.false;
        });
    });

    describe('setReference()', function () {
        it('should call the setter with the reference', function () {
            var newReference = sinon.createStubInstance(Reference);

            reference.setReference(newReference);

            expect(referenceSetter).to.have.been.calledOnce;
            expect(referenceSetter).to.have.been.calledWith(sinon.match.same(newReference));
        });

        it('should throw when no reference setter is defined', function () {
            var newReference = sinon.createStubInstance(Reference);
            reference = new AccessorReference(
                valueFactory,
                referenceFactory,
                valueGetter,
                valueSetter
            );

            expect(function () {
                reference.setReference(newReference);
            }).to.throw(
                Exception,
                'Accessor cannot have a reference set'
            );
        });
    });

    describe('setValue()', function () {
        it('should call the setter with the value', async function () {
            var newValue = valueFactory.createInteger(27);

            await reference.setValue(newValue).toPromise();

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter.args[0][0].getType()).to.equal('int');
            expect(valueSetter.args[0][0].getNative()).to.equal(27);
        });

        it('should return a Future that eventually resolves to the new value', async function () {
            var newValue = valueFactory.createString('my new value');

            expect(await reference.setValue(newValue).toPromise()).to.equal(newValue);
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise that resolves with the eventual Value from the getter', async function () {
            var resultValue;
            valueGetter.returns(101);

            resultValue = await reference.toPromise();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(101);
        });
    });
});
