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
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    PropertyReference = require('../../../src/Reference/Property'),
    MethodSpec = require('../../../src/MethodSpec'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync(),
    Variable = require('../../../src/Variable').sync();

describe('PropertyReference', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.classObject = sinon.createStubInstance(Class);
        this.factory = new ValueFactory();
        this.propertyValue = sinon.createStubInstance(Value);
        this.objectValue = sinon.createStubInstance(ObjectValue);
        this.objectValue.isMethodDefined.returns(false);
        this.keyValue = sinon.createStubInstance(Value);

        this.classObject.getName.returns('My\\AwesomeClass');
        this.keyValue.getNative.returns('my_property');
        this.keyValue.getType.returns('string');
        this.propertyValue.getForAssignment.returns(this.propertyValue);
        this.propertyValue.getNative.returns('value for my prop');
        this.propertyValue.getType.returns('string');

        this.createProperty = function (visibility) {
            this.property = new PropertyReference(
                this.factory,
                this.callStack,
                this.objectValue,
                this.keyValue,
                this.classObject,
                visibility || 'public',
                21
            );
        }.bind(this);
        this.createProperty();
    });

    describe('concatWith()', function () {
        it('should append the given value to the property\'s value and assign it back to the property', function () {
            this.property.setValue(this.factory.createString('value for my prop'));

            this.property.concatWith(this.factory.createString(' with world on the end'));

            expect(this.property.getNative()).to.equal('value for my prop with world on the end');
        });
    });

    describe('decrementBy()', function () {
        it('should subtract the given value from the property\'s value and assign it back to the property', function () {
            this.property.setValue(this.factory.createInteger(20));

            this.property.decrementBy(this.factory.createInteger(4));

            expect(this.property.getNative()).to.equal(16);
        });
    });

    describe('getExternalName()', function () {
        it('should prefix a private property\'s name with its visibility', function () {
            this.createProperty('private');

            expect(this.property.getExternalName()).to.equal('\0My\\AwesomeClass\0my_property');
        });

        it('should prefix a protected property\'s name with an asterisk to indicate its visibility', function () {
            this.createProperty('protected');

            expect(this.property.getExternalName()).to.equal('\0*\0my_property');
        });

        it('should just return the name for a public property', function () {
            expect(this.property.getExternalName()).to.equal('my_property');
        });
    });

    describe('getIndex()', function () {
        it('should return the index of the property', function () {
            expect(this.property.getIndex()).to.equal(21);
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the property\'s value', function () {
            this.property.initialise(this.propertyValue);

            expect(this.property.getNative()).to.equal('value for my prop');
        });
    });

    describe('getValue()', function () {
        describe('when the property is defined', function () {
            it('should return the value assigned', function () {
                this.property.initialise(this.propertyValue);

                expect(this.property.getValue()).to.equal(this.propertyValue);
            });

            it('should return the value assigned, when the property is a reference', function () {
                var reference = sinon.createStubInstance(Variable),
                    value = this.factory.createString('my current value');
                reference.getValue.returns(value);
                this.property.setReference(reference);

                expect(this.property.getValue()).to.equal(value);
            });
        });

        describe('when the property is not defined, but magic __get is', function () {
            beforeEach(function () {
                this.objectValue.isMethodDefined.withArgs('__get').returns(true);
            });

            it('should fetch the value via the magic getter', function () {
                var value = this.factory.createString('my current value');
                this.objectValue.callMethod.withArgs('__get').returns(value);

                expect(this.property.getValue()).to.equal(value);
                expect(this.objectValue.callMethod).to.have.been.calledOnce;
                expect(this.objectValue.callMethod).to.have.been.calledWith(
                    '__get',
                    [sinon.match.same(this.keyValue)]
                );
            });
        });

        describe('when the property is not defined, and magic __get is not either', function () {
            beforeEach(function () {
                this.objectValue.referToElement.withArgs('my_property').returns('property: MyClass::$my_property');
            });

            it('should raise a notice', function () {
                this.property.getValue();

                expect(this.callStack.raiseError).to.have.been.calledOnce;
                expect(this.callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'Undefined property: MyClass::$my_property'
                );
            });

            it('should return NULL', function () {
                expect(this.property.getValue().getType()).to.equal('null');
            });
        });
    });

    describe('getVisibility()', function () {
        it('should return the visibility of the property when public', function () {
            expect(this.property.getVisibility()).to.equal('public');
        });

        it('should return the visibility of the property when protected', function () {
            this.createProperty('protected');

            expect(this.property.getVisibility()).to.equal('protected');
        });
    });

    describe('incrementBy()', function () {
        it('should add the given value to the property\'s value and assign it back to the property', function () {
            this.property.setValue(this.factory.createInteger(20));

            this.property.incrementBy(this.factory.createInteger(4));

            expect(this.property.getNative()).to.equal(24);
        });
    });

    describe('initialise()', function () {
        it('should set the value of the property', function () {
            this.property.initialise(this.propertyValue);

            expect(this.property.getValue()).to.equal(this.propertyValue);
        });
    });

    describe('isDefined()', function () {
        it('should return true when the property is assigned a non-NULL value', function () {
            this.property.initialise(this.propertyValue);

            expect(this.property.isDefined()).to.be.true;
        });

        it('should return true when the property is assigned a NULL value', function () {
            this.property.setValue(this.factory.createNull());

            expect(this.property.isDefined()).to.be.true;
        });

        it('should return false when the property is not assigned a value', function () {
            this.keyValue.getNative.returns('not_my_property');

            expect(this.property.isDefined()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true when the property is not set', function () {
            this.property.unset();

            expect(this.property.isEmpty()).to.be.true;
        });

        it('should return true when the property is set to an empty value', function () {
            this.propertyValue.isEmpty.returns(true);

            expect(this.property.isEmpty()).to.be.true;
        });

        it('should return false when the property is set to a non-empty value', function () {
            this.property.initialise(this.propertyValue);
            this.propertyValue.isEmpty.returns(false);

            expect(this.property.isEmpty()).to.be.false;
        });
    });

    describe('isSet()', function () {
        it('should return true when the property is set', function () {
            this.property.initialise(this.propertyValue);

            expect(this.property.isSet()).to.be.true;
        });

        it('should return false when the property is not set', function () {
            expect(this.property.isSet()).to.be.false;
        });

        it('should return false when the property is set to null', function () {
            this.propertyValue.getType.returns('null');

            expect(this.property.isSet()).to.be.false;
        });
    });

    describe('isVisible()', function () {
        describe('for a public property', function () {
            it('should return true', function () {
                expect(this.property.isVisible()).to.be.true;
            });
        });

        describe('for a protected property', function () {
            beforeEach(function () {
                this.createProperty('protected');
                this.callingClass = sinon.createStubInstance(Class);
                this.callStack.getCurrentClass.returns(this.callingClass);
                this.callingClass.isInFamilyOf.returns(false);
            });

            it('should return true when the calling class is in the same family as the definer', function () {
                this.callingClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(true);

                expect(this.property.isVisible()).to.be.true;
            });

            it('should return false when the calling class is not in the same family as the definer', function () {
                this.callingClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(false);

                expect(this.property.isVisible()).to.be.false;
            });
        });

        describe('for a private property', function () {
            beforeEach(function () {
                this.createProperty('private');
                this.callingClass = sinon.createStubInstance(Class);
                this.callStack.getCurrentClass.returns(this.callingClass);
                this.callingClass.getName.returns('Some\\OtherClass');
                this.callingClass.isInFamilyOf.returns(false);
            });

            it('should return true when the calling class is the definer', function () {
                this.callingClass.getName.returns('My\\AwesomeClass');

                expect(this.property.isVisible()).to.be.true;
            });

            it('should return false even when the calling class is in the same family as the definer', function () {
                this.callingClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(true);

                expect(this.property.isVisible()).to.be.false;
            });
        });
    });

    describe('setReference()', function () {
        it('should return the property reference', function () {
            var reference = sinon.createStubInstance(Variable);

            expect(this.property.setReference(reference)).to.equal(reference);
        });
    });

    describe('setValue()', function () {
        beforeEach(function () {
            this.newValue = this.factory.createString('my new value');
        });

        describe('when the property is not a reference', function () {
            it('should store the new value for the property', function () {
                this.property.setValue(this.newValue);

                expect(this.property.getNative()).to.equal('my new value');
            });

            it('should return the value assigned', function () {
                expect(this.property.setValue(this.newValue)).to.equal(this.newValue);
            });
        });

        describe('when the property is a reference', function () {
            beforeEach(function () {
                this.reference = sinon.createStubInstance(Variable);
                this.property.setReference(this.reference);
            });

            it('should set the property via the reference', function () {
                this.property.setValue(this.newValue);

                expect(this.reference.setValue).to.have.been.calledOnce;
                expect(this.reference.setValue).to.have.been.calledWith(sinon.match.same(this.newValue));
            });

            it('should return the value assigned', function () {
                expect(this.property.setValue(this.newValue)).to.equal(this.newValue);
            });
        });

        describe('when this property is the first one to be defined', function () {
            beforeEach(function () {
                this.objectValue.getLength.returns(0);
            });

            it('should change the object\'s array-like pointer to point to this property', function () {
                this.property.setValue(this.newValue);

                expect(this.objectValue.pointToProperty).to.have.been.calledOnce;
                expect(this.objectValue.pointToProperty).to.have.been.calledWith(sinon.match.same(this.property));
            });
        });

        describe('when this property is the second one to be defined', function () {
            beforeEach(function () {
                this.objectValue.getLength.returns(1);
            });

            it('should not change the array-like pointer', function () {
                this.property.setValue(this.newValue);

                expect(this.objectValue.pointToProperty).not.to.have.been.called;
            });
        });

        describe('when this property is not defined', function () {
            beforeEach(function () {
                this.objectValue.getLength.returns(0); // Property is the first to be defined

                this.keyValue.getNative.returns('my_new_property');
            });

            describe('when magic __set is not defined either', function () {
                it('should change the object\'s array-like pointer to point to this property', function () {
                    this.property.setValue(this.newValue);

                    expect(this.objectValue.pointToProperty).to.have.been.calledOnce;
                    expect(this.objectValue.pointToProperty).to.have.been.calledWith(sinon.match.same(this.property));
                });
            });

            describe('when magic __set is defined', function () {
                beforeEach(function () {
                    this.objectValue.isMethodDefined.withArgs('__set').returns(sinon.createStubInstance(MethodSpec));
                });

                it('should call the magic setter', function () {
                    this.property.setValue(this.newValue);

                    expect(this.objectValue.callMethod).to.have.been.calledOnce;
                    expect(this.objectValue.callMethod).to.have.been.calledWith('__set', [
                        sinon.match.same(this.keyValue),
                        sinon.match.same(this.newValue)
                    ]);
                });

                it('should not change the array-like pointer', function () {
                    this.property.setValue(this.newValue);

                    expect(this.objectValue.pointToProperty).not.to.have.been.called;
                });
            });
        });
    });

    describe('unset()', function () {
        it('should leave the property no longer set', function () {
            this.property.initialise(this.propertyValue);

            this.property.unset();

            expect(this.property.isSet()).to.be.false;
        });

        it('should leave the property empty', function () {
            this.property.initialise(this.propertyValue);

            this.property.unset();

            expect(this.property.isEmpty()).to.be.true;
        });

        it('should leave the property undefined', function () {
            this.property.initialise(this.propertyValue);

            this.property.unset();

            expect(this.property.isDefined()).to.be.false;
        });
    });
});
