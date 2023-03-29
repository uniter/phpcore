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
    Reference = require('../../../src/Reference/Reference'),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot');

describe('AccessorReference', function () {
    var createReference,
        definednessGetter,
        emptinessGetter,
        flow,
        futureFactory,
        readablenessGetter,
        reference,
        referenceClearer,
        referenceFactory,
        referenceGetter,
        referencenessGetter,
        referenceSetter,
        setnessGetter,
        state,
        undefinednessRaiser,
        unsetter,
        valueFactory,
        valueGetter,
        valueSetter;

    beforeEach(function () {
        state = tools.createIsolatedState();
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        referenceFactory = state.getReferenceFactory();
        definednessGetter = null;
        emptinessGetter = null;
        readablenessGetter = sinon.stub();
        referenceClearer = sinon.stub();
        referenceGetter = sinon.stub();
        referencenessGetter = sinon.stub();
        referenceSetter = sinon.stub();
        setnessGetter = null;
        undefinednessRaiser = null;
        unsetter = sinon.stub();
        valueFactory = state.getValueFactory();
        valueGetter = sinon.stub();
        valueSetter = sinon.stub();

        readablenessGetter.returns(true);
        referencenessGetter.returns(false);

        createReference = function () {
            reference = new AccessorReference(
                valueFactory,
                referenceFactory,
                futureFactory,
                flow,
                valueGetter,
                valueSetter,
                unsetter,
                referenceGetter,
                referenceSetter,
                referenceClearer,
                definednessGetter,
                readablenessGetter,
                emptinessGetter,
                setnessGetter,
                referencenessGetter,
                undefinednessRaiser
            );
        };
    });

    describe('asArrayElement()', function () {
        it('should return the result of the getter coerced to a PHP value', function () {
            var value;
            valueGetter.returns(101);
            createReference();

            value = reference.asArrayElement();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(101);
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to the native value returned by the getter', async function () {
            valueGetter.returns(101);
            createReference();

            expect(await reference.asEventualNative().toPromise()).to.equal(101);
        });
    });

    describe('asValue()', function () {
        it('should return the result of the getter coerced to a PHP value', function () {
            var value;
            valueGetter.returns(101);
            createReference();

            value = reference.asValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(101);
        });

        it('should return a rejected Future when the getter raises an error', async function () {
            valueGetter.throws(new Error('Bang!'));
            createReference();

            await expect(reference.asValue().toPromise()).to.eventually.be.rejectedWith('Bang!');
        });
    });

    describe('clearReference()', function () {
        it('should call the clearer', function () {
            createReference();

            reference.clearReference();

            expect(referenceClearer).to.have.been.calledOnce;
        });

        it('should throw when no reference clearer is defined', function () {
            referenceClearer = null;
            createReference();

            expect(function () {
                reference.clearReference();
            }).to.throw(
                Exception,
                'Accessor cannot have its reference cleared'
            );
        });
    });

    describe('getNative()', function () {
        it('should return result of the getter coerced to a PHP value', function () {
            valueGetter.returns(21);
            createReference();

            expect(reference.getNative()).to.equal(21);
        });
    });

    describe('getReference()', function () {
        it('should return the accessor reference itself with no reference getter', function () {
            referenceGetter = null;
            createReference();

            expect(reference.getReference()).to.equal(reference);
        });

        it('should return the result with a reference getter', function () {
            var referenceSlot = sinon.createStubInstance(ReferenceSlot);
            referenceGetter.returns(referenceSlot);
            createReference();

            expect(reference.getReference()).to.equal(referenceSlot);
        });
    });

    describe('getValue()', function () {
        it('should return the result of the getter coerced to a PHP value', function () {
            var value;
            valueGetter.returns(101);
            createReference();

            value = reference.getValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(101);
        });
    });

    describe('getValueOrNativeNull()', function () {
        beforeEach(function () {
            readablenessGetter = sinon.stub();
            readablenessGetter.returns(true);
        });

        it('should return the value when the readableness getter returns true', function () {
            var value = valueFactory.createString('my value');
            valueGetter.returns(value);
            createReference();

            expect(reference.getValueOrNativeNull()).to.equal(value);
        });

        it('should return native null when the readableness getter returns false', function () {
            readablenessGetter.returns(false);
            createReference();

            expect(reference.getValueOrNativeNull()).to.be.null;
        });
    });

    describe('getValueOrNull()', function () {
        it('should return the value when the getter returns a value', function () {
            var value = valueFactory.createString('my value');
            valueGetter.returns(value);
            createReference();

            expect(reference.getValueOrNull()).to.equal(value);
        });

        it('should return a NullValue when the getter returns no value', function () {
            createReference();

            expect(reference.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('hasReferenceSetter()', function () {
        it('should return true when a reference setter was given', function () {
            createReference();

            expect(reference.hasReferenceSetter()).to.be.true;
        });

        it('should return false when a reference setter was not given', function () {
            referenceSetter = null;
            createReference();

            expect(reference.hasReferenceSetter()).to.be.false;
        });
    });

    describe('isDefined()', function () {
        it('should return true when no definedness getter was given', function () {
            createReference();

            expect(reference.isDefined()).to.be.true;
        });

        it('should return true when a definedness getter was given that returns true', function () {
            definednessGetter = sinon.stub().returns(true);
            createReference();

            expect(reference.isDefined()).to.be.true;
        });

        it('should return true when a definedness getter was given that returns false', function () {
            definednessGetter = sinon.stub().returns(false);
            createReference();

            expect(reference.isDefined()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        describe('with no emptiness getter', function () {
            it('should return true when the getter\'s result resolves to an empty value', async function () {
                valueGetter.returns(valueFactory.createPresent(valueFactory.createArray([])));
                createReference();

                expect(await reference.isEmpty().toPromise()).to.be.true;
            });

            it('should return false when the getter\'s result resolves to a non-empty value', async function () {
                valueGetter.returns(valueFactory.createPresent(21));
                createReference();

                expect(await reference.isEmpty().toPromise()).to.be.false;
            });
        });

        describe('with an emptiness getter', function () {
            beforeEach(function () {
                emptinessGetter = sinon.stub();
            });

            it('should return true when the emptiness getter returns true', async function () {
                emptinessGetter.returns(futureFactory.createPresent(true));
                createReference();

                expect(await reference.isEmpty().toPromise()).to.be.true;
            });

            it('should return true when the emptiness getter returns false', async function () {
                emptinessGetter.returns(futureFactory.createPresent(false));
                createReference();

                expect(await reference.isEmpty().toPromise()).to.be.false;
            });
        });
    });

    describe('isFuture()', function () {
        it('should return false', function () {
            createReference();

            expect(reference.isFuture()).to.be.false;
        });
    });

    describe('isReadable()', function () {
        beforeEach(function () {
            definednessGetter = sinon.stub();
            definednessGetter.returns(false);
        });

        it('should return true when the readableness getter returns true', function () {
            readablenessGetter.returns(true);
            createReference();

            expect(reference.isReadable()).to.be.true;
        });

        it('should return false when the readableness getter returns false', function () {
            readablenessGetter.returns(false);
            createReference();

            expect(reference.isReadable()).to.be.false;
        });

        it('should return true when no readableness getter was given but definedness is true', function () {
            readablenessGetter = null;
            definednessGetter.returns(true);
            createReference();

            expect(reference.isReadable()).to.be.true;
        });

        it('should return false when no readableness getter was given and definedness is false', function () {
            readablenessGetter = null;
            definednessGetter.returns(false);
            createReference();

            expect(reference.isReadable()).to.be.false;
        });
    });

    describe('isReference()', function () {
        it('should return true when the referenceness getter returns true', function () {
            referencenessGetter.returns(true);
            createReference();

            expect(reference.isReference()).to.be.true;
        });

        it('should return false when the referenceness getter returns false', function () {
            referencenessGetter.returns(false);
            createReference();

            expect(reference.isReference()).to.be.false;
        });

        it('should return false when no referenceness getter was given', function () {
            referenceGetter = null;
            createReference();

            expect(reference.isReference()).to.be.false;
        });
    });

    describe('isReferenceable()', function () {
        it('should return true', function () {
            createReference();

            expect(reference.isReferenceable()).to.be.true;
        });
    });

    describe('isSet()', function () {
        describe('with no setness getter', function () {
            it('should return true when the getter\'s result resolves to a set value', async function () {
                valueGetter.returns(valueFactory.createPresent(true));
                createReference();

                expect(await reference.isSet().toPromise()).to.be.true;
            });

            it('should return false when the getter\'s result resolves to an unset value', async function () {
                valueGetter.returns(valueFactory.createPresent(null));
                createReference();

                expect(await reference.isSet().toPromise()).to.be.false;
            });
        });

        describe('with a setness getter', function () {
            beforeEach(function () {
                setnessGetter = sinon.stub();
            });

            it('should return true when the setness getter returns true', async function () {
                setnessGetter.returns(futureFactory.createPresent(true));
                createReference();

                expect(await reference.isSet().toPromise()).to.be.true;
            });

            it('should return true when the setness getter returns false', async function () {
                setnessGetter.returns(futureFactory.createPresent(false));
                createReference();

                expect(await reference.isSet().toPromise()).to.be.false;
            });
        });
    });

    describe('raiseUndefined()', function () {
        it('should return the result with an undefinedness raiser', function () {
            var result = valueFactory.createString('my value');
            undefinednessRaiser = sinon.stub();
            undefinednessRaiser.returns(result);
            createReference();

            expect(reference.raiseUndefined()).to.equal(result);
        });

        it('should throw when no undefinedness raiser is given', function () {
            createReference();

            expect(function () {
                reference.raiseUndefined();
            }).to.throw(
                Exception,
                'Unable to raise AccessorReference as undefined - did you mean to provide an undefinednessRaiser?'
            );
        });
    });

    describe('setReference()', function () {
        it('should call the setter with the reference', function () {
            var newReference = sinon.createStubInstance(Reference);
            createReference();

            reference.setReference(newReference);

            expect(referenceSetter).to.have.been.calledOnce;
            expect(referenceSetter).to.have.been.calledWith(sinon.match.same(newReference));
        });

        it('should throw when no reference setter is defined', function () {
            var newReference = sinon.createStubInstance(Reference);
            referenceSetter = null;
            createReference();

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
            createReference();

            await reference.setValue(newValue).toPromise();

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter.args[0][0].getType()).to.equal('int');
            expect(valueSetter.args[0][0].getNative()).to.equal(27);
        });

        it('should return a Future that eventually resolves to the new value', async function () {
            var newValue = valueFactory.createString('my new value');
            createReference();

            expect(await reference.setValue(newValue).toPromise()).to.equal(newValue);
        });

        it('should coerce the result of the setter to a Value', async function () {
            var newValue = valueFactory.createString('my new value'),
                result;
            valueSetter.returns('my setter result');
            createReference();

            result = await reference.setValue(newValue).toPromise();

            expect(result.getType()).to.equal('string');
            expect(result.getNative()).to.equal('my setter result');
        });

        it('should return a rejected Future when the setter throws', async function () {
            var newValue = valueFactory.createString('my new value');
            valueSetter.throws(new Error('Bang!'));
            createReference();

            await expect(reference.setValue(newValue).toPromise())
                .to.eventually.be.rejectedWith('Bang!');
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise that resolves to the AccessorReference', async function () {
            createReference();

            expect(await reference.toPromise()).to.equal(reference);
        });
    });

    describe('unset()', function () {
        it('should call the unsetter', async function () {
            createReference();

            await reference.unset();

            expect(unsetter).to.have.been.calledOnce;
        });

        it('should return a Future that resolves to null', async function () {
            createReference();

            expect(await reference.unset().toPromise()).to.be.null;
        });

        it('should throw when no unsetter is defined', function () {
            unsetter = null;
            createReference();

            expect(function () {
                reference.unset();
            }).to.throw(
                Exception,
                'Accessor cannot be unset'
            );
        });
    });

    describe('yieldSync()', function () {
        it('should just return the reference', function () {
            createReference();

            expect(reference.yieldSync()).to.equal(reference);
        });
    });
});
