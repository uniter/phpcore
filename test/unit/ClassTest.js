/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    ArrayValue = require('../../src/Value/Array').sync(),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    PHPFatalError = require('phpcommon').PHPFatalError,
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    StringValue = require('../../src/Value/String').sync(),
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

        this.valueFactory.coerce.restore();
        sinon.stub(this.valueFactory, 'coerce', function (nativeValue) {
            if (nativeValue instanceof Value) {
                return nativeValue;
            }

            if (_.isString(nativeValue)) {
                return this.valueFactory.createString(nativeValue);
            }

            throw new Error('Unsupported value: ' + nativeValue);
        }.bind(this));

        this.valueFactory.createString.restore();
        sinon.stub(this.valueFactory, 'createString', function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getNative.returns(nativeValue);
            return stringValue;
        }.bind(this));

        this.valueFactory.createArray.restore();
        sinon.stub(this.valueFactory, 'createArray', function (elements) {
            var arrayValue = sinon.createStubInstance(ArrayValue);
            arrayValue.getNative.returns(elements);
            return arrayValue;
        }.bind(this));

        this.createClass = function (constructorName, superClass) {
            this.classObject = new Class(
                this.valueFactory,
                this.callStack,
                'My\\Class\\Path\\Here',
                constructorName,
                this.InternalClass,
                {},
                {},
                superClass,
                ['My\\Interface'],
                this.namespaceScope
            );
        }.bind(this);
    });

    describe('callMethod()', function () {
        describe('when the object is an instance of the native constructor', function () {
            beforeEach(function () {
                this.nativeObject = sinon.createStubInstance(this.InternalClass);
                this.objectValue = sinon.createStubInstance(ObjectValue);
                this.objectValue.getObject.returns(this.nativeObject);
                this.superClass = null;

                this.callMethod = function (methodName, args) {
                    return this.classObject.callMethod(
                        methodName,
                        args,
                        this.objectValue
                    );
                }.bind(this);
            });

            describe('when the method is defined with the same case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when the method is defined with differing case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethodWITHWRONGcase = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethodWithWrongCase', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethodWithWrongCase', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when an own property is defined with the same name as the method', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.nativeObject.myMethod = sinon.stub(); // Should be ignored
                    this.createClass('__construct', null);
                });

                it('should ignore the property and call the method when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should ignore the property and call the method when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when the method is not defined', function () {
                it('should throw a PHPFatalError', function () {
                    this.createClass('__construct', null);

                    expect(function () {
                        this.callMethod('myMissingMethod', []);
                    }.bind(this)).to.throw(
                        PHPFatalError,
                        'Call to undefined method My\\Class\\Path\\Here::myMissingMethod()'
                    );
                });
            });
        });

        describe('when the object is not an instance of the native constructor (eg. JSObject/Closure)', function () {
            beforeEach(function () {
                this.nativeObject = {};
                this.objectValue = sinon.createStubInstance(ObjectValue);
                this.superClass = null;

                this.callMethod = function (methodName, args) {
                    return this.classObject.callMethod(
                        methodName,
                        args,
                        this.objectValue
                    );
                }.bind(this);
            });

            describe('when the method is defined with the same case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when the method is defined with differing case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethodWITHWRONGcase = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethodWithWrongCase', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethodWithWrongCase', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when an own property is defined with the same name as the method', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.nativeObject.myMethod = sinon.stub(); // Should be ignored
                    this.createClass('__construct', null);
                });

                it('should ignore the property and call the method when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should ignore the property and call the method when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when the method is not defined', function () {
                it('should throw a PHPFatalError', function () {
                    this.createClass('__construct', null);

                    expect(function () {
                        this.callMethod('myMissingMethod', []);
                    }.bind(this)).to.throw(
                        PHPFatalError,
                        'Call to undefined method My\\Class\\Path\\Here::myMissingMethod()'
                    );
                });
            });
        });
    });

    describe('construct()', function () {
        beforeEach(function () {
            this.objectValue = sinon.createStubInstance(ObjectValue);
        });

        describe('when this class defines a constructor', function () {
            beforeEach(function () {
                this.createClass('__construct', this.superClass);
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
                this.createClass(null, this.superClass);
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

    describe('getConstantByName()', function () {
        it('should return the FQCN for the magic `::class` constant', function () {
            this.createClass('__construct', this.superClass);

            expect(this.classObject.getConstantByName('class').getNative()).to.equal('My\\Class\\Path\\Here');
        });
    });

    describe('getSuperClass()', function () {
        it('should return the parent of this class when it has one', function () {
            this.createClass('__construct', this.superClass);

            expect(this.classObject.getSuperClass()).to.equal(this.superClass);
        });

        it('should return null when this class does not have a parent', function () {
            this.createClass('__construct', null);

            expect(this.classObject.getSuperClass()).to.be.null;
        });
    });

    describe('instantiate()', function () {
        beforeEach(function () {
            this.objectValue = sinon.createStubInstance(ObjectValue);
            this.createClass('__construct', this.superClass);
        });

        it('should call the internal constructor with arguments wrapped by default', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);
            this.valueFactory.createObject.returns(this.objectValue);

            this.classObject.instantiate([arg1, arg2]);

            expect(this.InternalClass).to.have.been.calledOnce;
            expect(this.InternalClass).to.have.been.calledOn(sinon.match.same(this.objectValue));
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
            expect(this.InternalClass).to.have.been.calledOn(sinon.match.same(this.objectValue));
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
            this.createClass('__construct', this.superClass);
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
