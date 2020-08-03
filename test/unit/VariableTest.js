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
    CallStack = require('../../src/CallStack'),
    IntegerValue = require('../../src/Value/Integer').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    PropertyReference = require('../../src/Reference/Property'),
    Reference = require('../../src/Reference/Reference'),
    ReferenceSlot = require('../../src/Reference/ReferenceSlot'),
    StringValue = require('../../src/Value/String').sync(),
    ValueFactory = require('../../src/ValueFactory').sync(),
    Variable = require('../../src/Variable').sync();

describe('Variable', function () {
    var callStack,
        valueFactory,
        variable;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        valueFactory = new ValueFactory();

        callStack.raiseTranslatedError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, translationKey, placeholderVariables) {
                throw new Error(
                    'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
                );
            });

        variable = new Variable(callStack, valueFactory, 'myVar');
    });

    describe('concatWith()', function () {
        it('should concatenate a string onto the end of an existing string', function () {
            variable.setValue(valueFactory.createString('hello'));
            
            variable.concatWith(valueFactory.createString('world'));
            
            expect(variable.getValue()).to.be.an.instanceOf(StringValue);
            expect(variable.getValue().getNative()).to.equal('helloworld');
        });
    });

    describe('divideBy()', function () {
        it('should divide the variable\'s value by the given value and assign it back to the variable', function () {
            variable.setValue(valueFactory.createInteger(20));

            variable.divideBy(valueFactory.createInteger(4));

            expect(variable.getNative()).to.equal(5);
        });
    });

    describe('formatAsString()', function () {
        it('should format the value when the variable is defined with a value', function () {
            variable.setValue(valueFactory.createString('my value'));

            expect(variable.formatAsString()).to.equal('\'my value\'');
        });

        it('should format the value of the reference when the variable is defined with a reference', function () {
            var reference = sinon.createStubInstance(Reference);
            reference.getValue.returns(valueFactory.createString('my val from reference'));
            variable.setReference(reference);

            expect(variable.formatAsString()).to.equal('\'my val from ref...\'');
        });

        it('should return "NULL" when the variable is not defined', function () {
            expect(variable.formatAsString()).to.equal('NULL');
        });
    });

    describe('getInstancePropertyByName()', function () {
        it('should return the property from the value when the variable is not $this and the value is set', function () {
            var objectValue = sinon.createStubInstance(ObjectValue),
                propertyReference = sinon.createStubInstance(PropertyReference);
            objectValue.getForAssignment.returns(objectValue);
            objectValue.getInstancePropertyByName
                .withArgs(sinon.match(function (arg) {
                    return arg.getNative() === 'myProp';
                }))
                .returns(propertyReference);
            variable.setValue(objectValue);

            expect(
                variable.getInstancePropertyByName(
                    valueFactory.createString('myProp')
                )
            ).to.equal(propertyReference);
        });

        it('should return the property from the value when the variable is $this and the value is set', function () {
            var objectValue = sinon.createStubInstance(ObjectValue),
                propertyReference = sinon.createStubInstance(PropertyReference);
            variable = new Variable(callStack, valueFactory, 'this');
            objectValue.getForAssignment.returns(objectValue);
            objectValue.getInstancePropertyByName
                .withArgs(sinon.match(function (arg) {
                    return arg.getNative() === 'myProp';
                }))
                .returns(propertyReference);
            variable.setValue(objectValue);

            expect(
                variable.getInstancePropertyByName(
                    valueFactory.createString('myProp')
                )
            ).to.equal(propertyReference);
        });

        it('should raise a "Using $this when not in object context" error when the variable is $this and the value is not set', function () {
            variable = new Variable(callStack, valueFactory, 'this');

            expect(function () {
                variable.getInstancePropertyByName(
                    valueFactory.createString('myProp')
                );
            }).to.throw(
                'Fake PHP Fatal error for #core.used_this_outside_object_context with {}'
            );
        });
    });

    describe('getName()', function () {
        it('should return the name of the variable', function () {
            expect(variable.getName()).to.equal('myVar');
        });
    });

    describe('getReference()', function () {
        it('should return the existing reference if the variable already has one assigned (may not be a ReferenceSlot)', function () {
            var reference = sinon.createStubInstance(Reference);
            variable.setReference(reference);

            expect(variable.getReference()).to.equal(reference);
        });

        it('should return the existing reference on subsequent calls (ensure no ReferenceSlot is created)', function () {
            var reference = sinon.createStubInstance(Reference);
            variable.setReference(reference);

            variable.getReference(); // First call
            expect(variable.getReference()).to.equal(reference);
        });

        it('should assign a ReferenceSlot to the variable if it was undefined', function () {
            var referenceSlot = variable.getReference();

            expect(referenceSlot).to.be.an.instanceOf(ReferenceSlot);
        });

        it('should return the same ReferenceSlot on subsequent calls', function () {
            var referenceSlot = variable.getReference();

            expect(variable.getReference()).to.equal(referenceSlot); // Call again
        });

        it('should assign any existing value of the variable to the new ReferenceSlot', function () {
            var existingValue = valueFactory.createString('my existing value'),
                referenceSlot;
            variable.setValue(existingValue);

            referenceSlot = variable.getReference();

            expect(referenceSlot.getValue()).to.equal(existingValue);
        });

        it('should subsequently inherit its value from future values of the ReferenceSlot', function () {
            var referenceSlot = variable.getReference(),
                value = valueFactory.createString('my new value');
            referenceSlot.setValue(value);

            expect(variable.getValue()).to.equal(value);
        });
    });

    describe('getValue()', function () {
        it('should return the value of the variable when set', function () {
            var value;
            variable.setValue(valueFactory.createInteger(1234));

            value = variable.getValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(1234);
        });

        it('should return the value of the variable\'s reference when set', function () {
            var reference = sinon.createStubInstance(Reference),
                value;
            variable.setReference(reference);
            reference.getValue.returns(valueFactory.createInteger(4321));

            value = variable.getValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(4321);
        });

        it('should raise a "Using $this when not in object context" error when the variable is $this and the value is not set', function () {
            variable = new Variable(callStack, valueFactory, 'this');

            expect(function () {
                variable.getValue();
            }).to.throw(
                'Fake PHP Fatal error for #core.used_this_outside_object_context with {}'
            );
        });

        describe('when the variable is not defined', function () {
            it('should raise a notice', function () {
                variable.getValue();

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'Undefined variable: myVar'
                );
            });

            it('should return null', function () {
                expect(variable.getValue().getType()).to.equal('null');
            });
        });
    });

    describe('getValueOrNull()', function () {
        it('should return the value when the variable is defined with a value', function () {
            var value = valueFactory.createString('my value');
            variable.setValue(value);

            expect(variable.getValueOrNull()).to.equal(value);
        });

        it('should return the value of the reference when the variable is defined with a reference', function () {
            var reference = sinon.createStubInstance(Reference),
                value = valueFactory.createString('my val from reference');
            reference.getValue.returns(value);
            variable.setReference(reference);

            expect(variable.getValueOrNull()).to.equal(value);
        });

        it('should return a NullValue when the variable is not defined', function () {
            expect(variable.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('isDefined()', function () {
        it('should return true when the variable has a value assigned', function () {
            variable.setValue(valueFactory.createString('a value'));

            expect(variable.isDefined()).to.be.true;
        });

        it('should return true when the variable has a reference assigned', function () {
            var reference = sinon.createStubInstance(Reference);
            variable.setReference(reference);

            expect(variable.isDefined()).to.be.true;
        });

        it('should return false otherwise', function () {
            expect(variable.isDefined()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true when the variable is unset', function () {
            variable.unset();

            expect(variable.isEmpty()).to.be.true;
        });

        it('should return true when the variable is set to an empty value', function () {
            var value = sinon.createStubInstance(StringValue);
            value.getForAssignment.returns(value);
            value.isEmpty.returns(true);
            variable.setValue(value);

            expect(variable.isEmpty()).to.be.true;
        });

        it('should return false when the variable is set to a non-empty value', function () {
            var value = sinon.createStubInstance(StringValue);
            value.getForAssignment.returns(value);
            value.isEmpty.returns(false);
            variable.setValue(value);

            expect(variable.isEmpty()).to.be.false;
        });
    });

    describe('postDecrement()', function () {
        var decrementedValue,
            originalValue;

        beforeEach(function () {
            originalValue = sinon.createStubInstance(IntegerValue);
            decrementedValue = sinon.createStubInstance(IntegerValue);
            decrementedValue.getForAssignment.returns(decrementedValue);
            originalValue.decrement.returns(decrementedValue);
            originalValue.getForAssignment.returns(originalValue);
            variable.setValue(originalValue);
        });

        it('should assign the decremented value to the variable', function () {
            variable.postDecrement();

            expect(variable.getValue()).to.equal(decrementedValue);
        });

        it('should return the original value', function () {
            expect(variable.postDecrement()).to.equal(originalValue);
        });
    });

    describe('postIncrement()', function () {
        var incrementedValue,
            originalValue;

        beforeEach(function () {
            originalValue = sinon.createStubInstance(IntegerValue);
            incrementedValue = sinon.createStubInstance(IntegerValue);
            incrementedValue.getForAssignment.returns(incrementedValue);
            originalValue.increment.returns(incrementedValue);
            originalValue.getForAssignment.returns(originalValue);
            variable.setValue(originalValue);
        });

        it('should assign the incremented value to the variable', function () {
            variable.postIncrement();

            expect(variable.getValue()).to.equal(incrementedValue);
        });

        it('should return the original value', function () {
            expect(variable.postIncrement()).to.equal(originalValue);
        });
    });

    describe('preDecrement()', function () {
        var decrementedValue,
            originalValue;

        beforeEach(function () {
            originalValue = sinon.createStubInstance(IntegerValue);
            decrementedValue = sinon.createStubInstance(IntegerValue);
            decrementedValue.getForAssignment.returns(decrementedValue);
            originalValue.decrement.returns(decrementedValue);
            originalValue.getForAssignment.returns(originalValue);
            variable.setValue(originalValue);
        });

        it('should assign the decremented value to the variable', function () {
            variable.preDecrement();

            expect(variable.getValue()).to.equal(decrementedValue);
        });

        it('should return the decremented value', function () {
            expect(variable.preDecrement()).to.equal(decrementedValue);
        });
    });

    describe('preIncrement()', function () {
        var incrementedValue,
            originalValue;

        beforeEach(function () {
            originalValue = sinon.createStubInstance(IntegerValue);
            incrementedValue = sinon.createStubInstance(IntegerValue);
            incrementedValue.getForAssignment.returns(incrementedValue);
            originalValue.increment.returns(incrementedValue);
            originalValue.getForAssignment.returns(originalValue);
            variable.setValue(originalValue);
        });

        it('should assign the incremented value to the referenced variable', function () {
            variable.preIncrement();

            expect(variable.getValue()).to.equal(incrementedValue);
        });

        it('should return the incremented value', function () {
            expect(variable.preIncrement()).to.equal(incrementedValue);
        });
    });

    describe('setReference()', function () {
        it('should return the variable', function () {
            var reference = sinon.createStubInstance(Reference);

            expect(variable.setReference(reference)).to.equal(variable);
        });
    });

    describe('setValue()', function () {
        it('should allow a normal variable to set to null', function () {
            expect(function () {
                variable.setValue(valueFactory.createNull());
            }).not.to.throw();
        });

        it('should unset $this when setting to null', function () {
            variable = new Variable(callStack, valueFactory, 'this');

            variable.setValue(valueFactory.createNull());

            expect(variable.isDefined()).to.be.false;
        });

        it('should return the null value when setting to null', function () {
            var value;
            variable = new Variable(callStack, valueFactory, 'this');

            value = variable.setValue(valueFactory.createNull());

            expect(value.getType()).to.equal('null');
        });
    });
});
