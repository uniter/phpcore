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
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Class', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.superClass = sinon.createStubInstance(Class);
        this.valueFactory = sinon.createStubInstance(ValueFactory);
        this.InternalClass = sinon.stub();
        this.interfaceObject = sinon.createStubInstance(Class);
        this.interfaceObject.is.withArgs('My\\Interface').returns(true);
        this.namespaceScope.getClass.withArgs('My\\Interface').returns(this.interfaceObject);

        this.createClass = function (constructorName) {
            this.classObject = new Class(
                this.valueFactory,
                this.callStack,
                'My\\Class\\Path\\Here',
                constructorName,
                this.InternalClass,
                {},
                {},
                this.superClass,
                ['My\\Interface'],
                this.namespaceScope
            );
        }.bind(this);
    });

    describe('construct()', function () {
        beforeEach(function () {
            this.objectValue = sinon.createStubInstance(ObjectValue);
        });

        describe('when this class defines a constructor', function () {
            beforeEach(function () {
                this.createClass('__construct');
            });

            it('should not call the superclass\' constructor', function () {
                this.classObject.construct(this.objectValue);

                expect(this.superClass.construct).not.to.have.been.called;
            });

            it('should call the constructor method', function () {
                this.classObject.construct(this.objectValue, [1, 2]);

                expect(this.objectValue.callMethod).to.have.been.calledOnce;
                expect(this.objectValue.callMethod).to.have.been.calledWith('__construct', [1, 2]);
            });
        });

        describe('when this class does not define a constructor', function () {
            beforeEach(function () {
                this.createClass(null);
            });

            it('should call the superclass\' constructor', function () {
                this.classObject.construct(this.objectValue);

                expect(this.superClass.construct).to.have.been.calledOnce;
                expect(this.superClass.construct).to.have.been.calledWith(
                    sinon.match.same(this.objectValue)
                );
            });

            it('should not call any method on the object', function () {
                this.classObject.construct(this.objectValue, [1, 2]);

                expect(this.objectValue.callMethod).not.to.have.been.called;
            });
        });
    });

    describe('instantiate()', function () {
        beforeEach(function () {
            this.objectValue = sinon.createStubInstance(ObjectValue);
            this.createClass('__construct');
        });

        it('should call the internal constructor with arguments wrapped by default', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);
            this.valueFactory.createObject.returns(this.objectValue);

            this.classObject.instantiate([arg1, arg2]);

            expect(this.InternalClass).to.have.been.calledOnce;
            expect(this.InternalClass).to.have.been.calledOn(sinon.match.instanceOf(this.InternalClass));
            expect(this.InternalClass).to.have.been.calledWith(
                sinon.match.same(arg1),
                sinon.match.same(arg2)
            );
        });

        it('should call the internal constructor with arguments unwrapped with auto-coercion enabled', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);
            this.valueFactory.createObject.returns(this.objectValue);
            arg1.getNative.returns(21);
            arg2.getNative.returns('second');
            this.classObject.enableAutoCoercion();

            this.classObject.instantiate([arg1, arg2]);

            expect(this.InternalClass).to.have.been.calledOnce;
            expect(this.InternalClass).to.have.been.calledOn(sinon.match.instanceOf(this.InternalClass));
            expect(this.InternalClass).to.have.been.calledWith(21, 'second');
        });

        it('should wrap an instance of the InternalClass in an ObjectValue', function () {
            this.valueFactory.createObject.returns(this.objectValue);

            this.classObject.instantiate([]);

            expect(this.valueFactory.createObject).to.have.been.calledOnce;
            expect(this.valueFactory.createObject).to.have.been.calledWith(
                sinon.match.instanceOf(this.InternalClass)
            );
        });

        it('should return the created object', function () {
            this.valueFactory.createObject.returns(this.objectValue);

            expect(this.classObject.instantiate([])).to.equal(this.objectValue);
        });
    });

    describe('is()', function () {
        beforeEach(function () {
            this.createClass('__construct');
        });

        it('should return true for the current class name case-insensitively', function () {
            expect(this.classObject.is('my\\CLASS\\path\\hEre')).to.be.true;
        });

        it('should return true when the superclass reports with true', function () {
            this.superClass.is.withArgs('Some\\Parent\\Class\\Path\\Here').returns(true);

            expect(this.classObject.is('Some\\Parent\\Class\\Path\\Here')).to.be.true;
        });

        it('should return false when not the current class or an ancestor class', function () {
            this.superClass.is.returns(false);

            expect(this.classObject.is('Some\\Class\\Or\\Other')).to.be.false;
        });

        it('should return true when this class implements the interface', function () {
            this.superClass.is.returns(false);

            expect(this.classObject.is('My\\Interface')).to.be.true;
        });

        it('should return false when this class does not implement the interface', function () {
            this.superClass.is.returns(false);

            expect(this.classObject.is('Not\\My\\Interface')).to.be.false;
        });
    });

    describe('isAutoCoercionEnabled()', function () {
        it('should return false by default', function () {
            expect(this.classObject.isAutoCoercionEnabled()).to.be.false;
        });

        it('should return true when enabled', function () {
            this.classObject.enableAutoCoercion();

            expect(this.classObject.isAutoCoercionEnabled()).to.be.true;
        });

        it('should return false when re-disabled', function () {
            this.classObject.enableAutoCoercion();
            this.classObject.disableAutoCoercion();

            expect(this.classObject.isAutoCoercionEnabled()).to.be.false;
        });
    });
});
