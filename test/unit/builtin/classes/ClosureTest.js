'use strict';

var closureClassFactory = require('../../../../src/builtin/classes/Closure'),
    expect = require('chai').expect,
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    CallStack = require('../../../../src/CallStack'),
    Class = require('../../../../src/Class').sync(),
    Closure = require('../../../../src/Closure').sync(),
    IntegerValue = require('../../../../src/Value/Integer').sync(),
    Namespace = require('../../../../src/Namespace').sync(),
    NullValue = require('../../../../src/Value/Null').sync(),
    ObjectValue = require('../../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Promise = require('lie'),
    StringValue = require('../../../../src/Value/String').sync(),
    Value = require('../../../../src/Value').sync(),
    ValueFactory = require('../../../../src/ValueFactory').sync(),
    Variable = require('../../../../src/Variable').sync();

describe('PHP builtin Closure class', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.valueFactory = sinon.createStubInstance(ValueFactory);
        this.disableAutoCoercion = sinon.stub();
        this.internals = {
            callStack: this.callStack,
            defineUnwrapper: sinon.stub(),
            disableAutoCoercion: this.disableAutoCoercion,
            globalNamespace: this.globalNamespace,
            pausable: null,
            valueFactory: this.valueFactory
        };
        this.Closure = closureClassFactory(this.internals);
        this.closureClass = sinon.createStubInstance(Class);
        this.closureClass.getName.returns('Closure');
        this.stdClassClass = sinon.createStubInstance(Class);
        this.stdClassClass.getName.returns('stdClass');
        this.globalNamespace.getClass.withArgs('Closure').returns(this.closureClass);

        this.valueFactory.coerce.restore();
        sinon.stub(this.valueFactory, 'coerce', function (nativeValue) {
            if (nativeValue instanceof Value) {
                return nativeValue;
            }

            if (typeof nativeValue === 'number') {
                return this.valueFactory.createInteger(nativeValue);
            }

            throw new Error('Unsupported value: ' + nativeValue);
        }.bind(this));
        this.valueFactory.createInteger.restore();
        sinon.stub(this.valueFactory, 'createInteger', function (nativeValue) {
            var integerValue = sinon.createStubInstance(IntegerValue);
            integerValue.getNative.returns(nativeValue);
            integerValue.getType.returns('integer');
            return integerValue;
        });
        this.valueFactory.createNull.restore();
        sinon.stub(this.valueFactory, 'createNull', function () {
            var nullValue = sinon.createStubInstance(NullValue);
            nullValue.getType.returns('null');
            return nullValue;
        });
        this.valueFactory.createObject.restore();
        sinon.stub(this.valueFactory, 'createObject', function (object, classObject) {
            var objectValue = sinon.createStubInstance(ObjectValue);
            objectValue.classIs.withArgs(classObject.getName()).returns(true);
            objectValue.classIs.returns(false);
            objectValue.getClass.returns(classObject);
            objectValue.getObject.returns(object);
            objectValue.getType.returns('object');
            return objectValue;
        });
        this.valueFactory.createString.restore();
        sinon.stub(this.valueFactory, 'createString', function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.coerceToString.returns(stringValue);
            stringValue.getNative.returns(nativeValue);
            stringValue.getType.returns('string');
            return stringValue;
        });
        this.valueFactory.isValue.restore();
        sinon.stub(this.valueFactory, 'isValue', function (value) {
            return value instanceof Value;
        });
    });

    describe('static ::bind()', function () {
        beforeEach(function () {
            this.closure = sinon.createStubInstance(Closure);
            this.boundClosure = sinon.createStubInstance(Closure);
            this.closureReference = sinon.createStubInstance(Variable);
            this.closureValue = this.valueFactory.createObject(this.closure, this.closureClass);
            this.closureValue.bindClosure.returns(this.boundClosure);
            this.closureReference.getValue.returns(this.closureValue);
            this.newThisReference = sinon.createStubInstance(Variable);
            this.newThisValue = this.valueFactory.createObject({}, this.stdClassClass);
            this.newThisReference.getValue.returns(this.newThisValue);
            this.args = [this.closureReference, this.newThisReference];

            this.callBind = function () {
                return this.Closure.prototype.bind.apply(null, this.args);
            }.bind(this);
        });

        it('should return a Closure ObjectValue with the bound closure', function () {
            var result = this.callBind();

            expect(result).to.be.an.instanceOf(ObjectValue);
            expect(result.getObject()).to.equal(this.boundClosure);
            expect(result.getClass()).to.equal(this.closureClass);
        });

        it('should raise an error and return null when no arguments are given', function () {
            this.args.length = 0;

            expect(this.callBind()).to.be.an.instanceOf(NullValue);
            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bind() expects at least 2 parameters, 0 given'
            );
        });

        it('should raise an error and return null when no `$this` object is given', function () {
            this.args.length = 1;

            expect(this.callBind()).to.be.an.instanceOf(NullValue);
            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bind() expects at least 2 parameters, 1 given'
            );
        });

        it('should raise an error and return null when `$this` object arg is not an object', function () {
            this.newThisReference.getValue.returns(this.valueFactory.createInteger(1002));

            expect(this.callBind()).to.be.an.instanceOf(NullValue);
            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bind() expects parameter 2 to be object, integer given'
            );
        });

        it('should allow `null` as `$this` object, for creating an unbound closure', function () {
            this.newThisReference.getValue.returns(this.valueFactory.createNull());

            this.callBind();

            expect(this.closureValue.bindClosure).to.have.been.calledOnce;
            expect(this.closureValue.bindClosure.args[0][0]).to.be.an.instanceOf(NullValue);
        });

        it('should raise an error and return null when `closure` arg is not an object', function () {
            this.closureReference.getValue.returns(this.valueFactory.createInteger(1002));

            expect(this.callBind()).to.be.an.instanceOf(NullValue);
            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bind() expects parameter 1 to be Closure, integer given'
            );
        });

        it('should raise an error and return null when `closure` arg is not a Closure instance', function () {
            this.closureReference.getValue.returns(this.valueFactory.createObject({}, this.stdClassClass));

            expect(this.callBind()).to.be.an.instanceOf(NullValue);
            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bind() expects parameter 1 to be Closure, object given'
            );
        });

        it('should use the class of the `$this` object as scope class if not specified', function () {
            this.callBind();

            expect(this.closureValue.bindClosure).to.have.been.calledOnce;
            expect(this.closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.stdClassClass)
            );
        });

        it('should use the class of the `$this` object as scope class if "static" is specified', function () {
            var scopeClassReference = sinon.createStubInstance(Variable),
                scopeClassValue = this.valueFactory.createString('static');
            scopeClassReference.getValue.returns(scopeClassValue);
            this.args[2] = scopeClassReference;

            this.callBind();

            expect(this.closureValue.bindClosure).to.have.been.calledOnce;
            expect(this.closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.stdClassClass)
            );
        });

        it('should use the class of the scope class object as scope class if an object is specified', function () {
            var scopeClassReference = sinon.createStubInstance(Variable),
                scopeClassValue = this.valueFactory.createObject({}, this.stdClassClass);
            scopeClassReference.getValue.returns(scopeClassValue);
            this.args[2] = scopeClassReference;

            this.callBind();

            expect(this.closureValue.bindClosure).to.have.been.calledOnce;
            expect(this.closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.stdClassClass)
            );
        });
    });

    describe('bindTo()', function () {
        beforeEach(function () {
            this.closure = sinon.createStubInstance(Closure);
            this.boundClosure = sinon.createStubInstance(Closure);
            this.closureValue = this.valueFactory.createObject(this.closure, this.closureClass);
            this.closureValue.bindClosure.returns(this.boundClosure);
            this.newThisReference = sinon.createStubInstance(Variable);
            this.newThisValue = this.valueFactory.createObject({}, this.stdClassClass);
            this.newThisReference.getValue.returns(this.newThisValue);
            this.args = [this.newThisReference];

            this.callBindTo = function () {
                return this.Closure.prototype.bindTo.apply(this.closureValue, this.args);
            }.bind(this);
        });

        it('should return a Closure ObjectValue with the bound closure', function () {
            var result = this.callBindTo();

            expect(result).to.be.an.instanceOf(ObjectValue);
            expect(result.getObject()).to.equal(this.boundClosure);
            expect(result.getClass()).to.equal(this.closureClass);
        });

        it('should raise an error and return null when no arguments are given', function () {
            this.args.length = 0;

            expect(this.callBindTo()).to.be.an.instanceOf(NullValue);
            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bindTo() expects at least 1 parameter, 0 given'
            );
        });

        it('should raise an error and return null when `$this` object arg is not an object', function () {
            this.newThisReference.getValue.returns(this.valueFactory.createInteger(1002));

            expect(this.callBindTo()).to.be.an.instanceOf(NullValue);
            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bindTo() expects parameter 1 to be object, integer given'
            );
        });

        it('should allow `null` as `$this` object, for creating an unbound closure', function () {
            this.newThisReference.getValue.returns(this.valueFactory.createNull());

            this.callBindTo();

            expect(this.closureValue.bindClosure).to.have.been.calledOnce;
            expect(this.closureValue.bindClosure.args[0][0]).to.be.an.instanceOf(NullValue);
        });

        it('should use the class of the `$this` object as scope class if not specified', function () {
            this.callBindTo();

            expect(this.closureValue.bindClosure).to.have.been.calledOnce;
            expect(this.closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.stdClassClass)
            );
        });

        it('should use the class of the `$this` object as scope class if "static" is specified', function () {
            var scopeClassReference = sinon.createStubInstance(Variable),
                scopeClassValue = this.valueFactory.createString('static');
            scopeClassReference.getValue.returns(scopeClassValue);
            this.args[1] = scopeClassReference;

            this.callBindTo();

            expect(this.closureValue.bindClosure).to.have.been.calledOnce;
            expect(this.closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.stdClassClass)
            );
        });

        it('should use the class of the scope class object as scope class if an object is specified', function () {
            var scopeClassReference = sinon.createStubInstance(Variable),
                scopeClassValue = this.valueFactory.createObject({}, this.stdClassClass);
            scopeClassReference.getValue.returns(scopeClassValue);
            this.args[1] = scopeClassReference;

            this.callBindTo();

            expect(this.closureValue.bindClosure).to.have.been.calledOnce;
            expect(this.closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.stdClassClass)
            );
        });
    });

    describe('the unwrapper defined', function () {
        beforeEach(function () {
            this.coercedThisObject = {};
            this.closure = sinon.createStubInstance(Closure);
            this.closureReturnValue = this.valueFactory.createString('my result native');
            this.closure.invoke.returns(this.closureReturnValue);
            this.nativeThisObject = {};
            this.valueFactory.coerceObject
                .withArgs(sinon.match.same(this.nativeThisObject))
                .returns(this.coercedThisObject);
            this.closureValue = this.valueFactory.createObject(this.closure, this.closureClass);

            this.callUnwrapper = function () {
                this.unwrappedClosure = this.internals.defineUnwrapper.args[0][0].call(this.closureValue);
            }.bind(this);
        });

        describe('in synchronous mode (when Pausable is not available)', function () {
            it('should pass the coerced arguments to Closure.invoke(...)', function () {
                this.callUnwrapper();

                this.unwrappedClosure(21, 38);

                expect(this.closure.invoke).to.have.been.calledOnce;
                expect(this.closure.invoke.args[0][0][0].getNative()).to.equal(21);
                expect(this.closure.invoke.args[0][0][1].getNative()).to.equal(38);
            });

            it('should coerce the `$this` object to an object', function () {
                this.callUnwrapper();

                expect(this.unwrappedClosure).to.be.a('function');
                this.unwrappedClosure.call(this.nativeThisObject);
                expect(this.closure.invoke).to.have.been.calledOnce;
                expect(this.closure.invoke).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(this.coercedThisObject)
                );
            });

            it('should return the native value of the result from Closure.invoke(...)', function () {
                this.callUnwrapper();

                expect(this.unwrappedClosure()).to.equal('my result native');
            });

            it('should not catch a non-PHP error', function () {
                this.closure.invoke.throws(new TypeError('A type error occurred'));
                this.callUnwrapper();

                expect(function () {
                    this.unwrappedClosure();
                }.bind(this)).to.throw(TypeError, 'A type error occurred');
            });

            it('should coerce a PHP error to a native JS one and rethrow it as that', function () {
                var errorValue = sinon.createStubInstance(ObjectValue);
                errorValue.getType.returns('object');
                errorValue.coerceToNativeError.returns(new Error('My error, coerced from a PHP exception'));
                this.closure.invoke.throws(errorValue);
                this.callUnwrapper();

                expect(function () {
                    this.unwrappedClosure();
                }.bind(this)).to.throw(Error, 'My error, coerced from a PHP exception');
            });
        });

        describe('in asynchronous mode (when Pausable is available)', function () {
            beforeEach(function () {
                this.pausableCall = sinon.spy(function (func, args, thisObj) {
                    return new Promise(function (resolve, reject) {
                        setTimeout(function () {
                            try {
                                resolve(func.apply(thisObj, args));
                            } catch (error) {
                                reject(error);
                            }
                        }, 1);
                    });
                });
                this.internals.pausable = {
                    call: this.pausableCall
                };
            });

            it('should pass the coerced arguments to Closure.invoke(...)', function () {
                this.callUnwrapper();

                return this.unwrappedClosure(21, 38).then(function () {
                    expect(this.closure.invoke).to.have.been.calledOnce;
                    expect(this.closure.invoke.args[0][0][0].getNative()).to.equal(21);
                    expect(this.closure.invoke.args[0][0][1].getNative()).to.equal(38);
                }.bind(this));
            });

            it('should coerce the `$this` object to an object', function () {
                this.callUnwrapper();

                expect(this.unwrappedClosure).to.be.a('function');
                return this.unwrappedClosure.call(this.nativeThisObject).then(function () {
                    expect(this.closure.invoke).to.have.been.calledOnce;
                    expect(this.closure.invoke).to.have.been.calledWith(
                        sinon.match.any,
                        sinon.match.same(this.coercedThisObject)
                    );
                }.bind(this));
            });

            it('should return the native value of the result from Closure.invoke(...)', function () {
                this.callUnwrapper();

                return expect(this.unwrappedClosure()).to.eventually.equal('my result native');
            });

            it('should not catch a non-PHP error', function () {
                this.closure.invoke.throws(new TypeError('A type error occurred'));
                this.callUnwrapper();

                return expect(this.unwrappedClosure())
                    .to.eventually.be.rejectedWith(TypeError, 'A type error occurred');
            });

            it('should coerce a PHP error to a native JS one and rethrow it as that', function () {
                var errorValue = sinon.createStubInstance(ObjectValue);
                errorValue.getType.returns('object');
                errorValue.coerceToNativeError.returns(new Error('My error, coerced from a PHP exception'));
                this.closure.invoke.throws(errorValue);
                this.callUnwrapper();

                return expect(this.unwrappedClosure())
                    .to.eventually.be.rejectedWith(Error, 'My error, coerced from a PHP exception');
            });
        });
    });
});
