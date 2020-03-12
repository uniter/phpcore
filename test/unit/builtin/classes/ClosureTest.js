/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var closureClassFactory = require('../../../../src/builtin/classes/Closure'),
    expect = require('chai').expect,
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    CallFactory = require('../../../../src/CallFactory'),
    CallStack = require('../../../../src/CallStack'),
    Class = require('../../../../src/Class').sync(),
    Closure = require('../../../../src/Closure').sync(),
    ErrorPromoter = require('../../../../src/Error/ErrorPromoter'),
    FFICall = require('../../../../src/FFI/Call'),
    Namespace = require('../../../../src/Namespace').sync(),
    NullValue = require('../../../../src/Value/Null').sync(),
    ObjectValue = require('../../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Promise = require('lie'),
    ValueFactory = require('../../../../src/ValueFactory').sync(),
    Variable = require('../../../../src/Variable').sync();

describe('PHP builtin Closure class', function () {
    var callFactory,
        callStack,
        closureClass,
        disableAutoCoercion,
        errorPromoter,
        globalNamespace,
        InternalClosureClass,
        internals,
        stdClassClass,
        valueFactory;

    beforeEach(function () {
        callFactory = sinon.createStubInstance(CallFactory);
        callFactory.createFFICall.callsFake(function () {
            return sinon.createStubInstance(FFICall);
        });
        callStack = sinon.createStubInstance(CallStack);
        errorPromoter = sinon.createStubInstance(ErrorPromoter);
        globalNamespace = sinon.createStubInstance(Namespace);
        valueFactory = new ValueFactory(
            null,
            null,
            null,
            null,
            null,
            errorPromoter
        );
        disableAutoCoercion = sinon.stub();
        internals = {
            callFactory: callFactory,
            callStack: callStack,
            defineUnwrapper: sinon.stub(),
            disableAutoCoercion: disableAutoCoercion,
            errorPromoter: errorPromoter,
            globalNamespace: globalNamespace,
            mode: 'sync',
            pausable: null,
            valueFactory: valueFactory
        };
        InternalClosureClass = closureClassFactory(internals);
        closureClass = sinon.createStubInstance(Class);
        closureClass.getName.returns('Closure');
        stdClassClass = sinon.createStubInstance(Class);
        stdClassClass.getName.returns('stdClass');
        globalNamespace.getClass.withArgs('Closure').returns(closureClass);
        globalNamespace.getClass.withArgs('stdClass').returns(stdClassClass);
    });

    describe('static ::bind()', function () {
        var args,
            boundClosure,
            callBind,
            closure,
            closureReference,
            closureValue,
            newThisReference,
            newThisValue;

        beforeEach(function () {
            closure = sinon.createStubInstance(Closure);
            boundClosure = sinon.createStubInstance(Closure);
            closureReference = sinon.createStubInstance(Variable);
            closureValue = sinon.createStubInstance(ObjectValue);
            closureValue.bindClosure.returns(boundClosure);
            closureValue.classIs.withArgs('Closure').returns(true);
            closureValue.getClassName.returns('Closure');
            closureValue.getType.returns('object');
            closureReference.getValue.returns(closureValue);
            newThisReference = sinon.createStubInstance(Variable);
            newThisValue = valueFactory.createObject({}, stdClassClass);
            newThisReference.getValue.returns(newThisValue);
            args = [closureReference, newThisReference];

            callBind = function () {
                return InternalClosureClass.prototype.bind.apply(null, args);
            }.bind(this);
        });

        it('should return a Closure ObjectValue with the bound closure', function () {
            var result = callBind();

            expect(result).to.be.an.instanceOf(ObjectValue);
            expect(result.getObject()).to.equal(boundClosure);
            expect(result.getClass()).to.equal(closureClass);
        });

        it('should raise an error and return null when no arguments are given', function () {
            args.length = 0;

            expect(callBind()).to.be.an.instanceOf(NullValue);
            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bind() expects at least 2 parameters, 0 given'
            );
        });

        it('should raise an error and return null when no `$this` object is given', function () {
            args.length = 1;

            expect(callBind()).to.be.an.instanceOf(NullValue);
            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bind() expects at least 2 parameters, 1 given'
            );
        });

        it('should raise an error and return null when `$this` object arg is not an object', function () {
            newThisReference.getValue.returns(valueFactory.createInteger(1002));

            expect(callBind()).to.be.an.instanceOf(NullValue);
            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bind() expects parameter 2 to be object, int given'
            );
        });

        it('should allow `null` as `$this` object, for creating an unbound closure', function () {
            newThisReference.getValue.returns(valueFactory.createNull());

            callBind();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure.args[0][0]).to.be.an.instanceOf(NullValue);
        });

        it('should raise an error and return null when `closure` arg is not an object', function () {
            closureReference.getValue.returns(valueFactory.createInteger(1002));

            expect(callBind()).to.be.an.instanceOf(NullValue);
            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bind() expects parameter 1 to be Closure, int given'
            );
        });

        it('should raise an error and return null when `closure` arg is not a Closure instance', function () {
            closureReference.getValue.returns(valueFactory.createObject({}, stdClassClass));

            expect(callBind()).to.be.an.instanceOf(NullValue);
            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bind() expects parameter 1 to be Closure, object given'
            );
        });

        it('should use the class of the `$this` object as scope class if not specified', function () {
            callBind();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(stdClassClass)
            );
        });

        it('should use the class of the `$this` object as scope class if "static" is specified', function () {
            var scopeClassReference = sinon.createStubInstance(Variable),
                scopeClassValue = valueFactory.createString('static');
            scopeClassReference.getValue.returns(scopeClassValue);
            args[2] = scopeClassReference;

            callBind();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(stdClassClass)
            );
        });

        it('should use the class of the scope class object as scope class if an object is specified', function () {
            var scopeClassReference = sinon.createStubInstance(Variable),
                scopeClassValue = valueFactory.createObject({}, stdClassClass);
            scopeClassReference.getValue.returns(scopeClassValue);
            args[2] = scopeClassReference;

            callBind();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(stdClassClass)
            );
        });
    });

    describe('bindTo()', function () {
        var args,
            boundClosure,
            callBindTo,
            closure,
            closureValue,
            newThisReference,
            newThisValue;

        beforeEach(function () {
            closure = sinon.createStubInstance(Closure);
            boundClosure = sinon.createStubInstance(Closure);
            closureValue = sinon.createStubInstance(ObjectValue);
            closureValue.bindClosure.returns(boundClosure);
            closureValue.classIs.withArgs('Closure').returns(true);
            closureValue.getClassName.returns('Closure');
            closureValue.getType.returns('object');
            newThisReference = sinon.createStubInstance(Variable);
            newThisValue = valueFactory.createObject({}, stdClassClass);
            newThisReference.getValue.returns(newThisValue);
            args = [newThisReference];

            callBindTo = function () {
                return InternalClosureClass.prototype.bindTo.apply(closureValue, args);
            }.bind(this);
        });

        it('should return a Closure ObjectValue with the bound closure', function () {
            var result = callBindTo();

            expect(result).to.be.an.instanceOf(ObjectValue);
            expect(result.getObject()).to.equal(boundClosure);
            expect(result.getClass()).to.equal(closureClass);
        });

        it('should raise an error and return null when no arguments are given', function () {
            args.length = 0;

            expect(callBindTo()).to.be.an.instanceOf(NullValue);
            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bindTo() expects at least 1 parameter, 0 given'
            );
        });

        it('should raise an error and return null when `$this` object arg is not an object', function () {
            newThisReference.getValue.returns(valueFactory.createInteger(1002));

            expect(callBindTo()).to.be.an.instanceOf(NullValue);
            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'Closure::bindTo() expects parameter 1 to be object, int given'
            );
        });

        it('should allow `null` as `$this` object, for creating an unbound closure', function () {
            newThisReference.getValue.returns(valueFactory.createNull());

            callBindTo();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure.args[0][0]).to.be.an.instanceOf(NullValue);
        });

        it('should use the class of the `$this` object as scope class if not specified', function () {
            callBindTo();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(stdClassClass)
            );
        });

        it('should use the class of the `$this` object as scope class if "static" is specified', function () {
            var scopeClassReference = sinon.createStubInstance(Variable),
                scopeClassValue = valueFactory.createString('static');
            scopeClassReference.getValue.returns(scopeClassValue);
            args[1] = scopeClassReference;

            callBindTo();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(stdClassClass)
            );
        });

        it('should use the class of the scope class object as scope class if an object is specified', function () {
            var scopeClassReference = sinon.createStubInstance(Variable),
                scopeClassValue = valueFactory.createObject({}, stdClassClass);
            scopeClassReference.getValue.returns(scopeClassValue);
            args[1] = scopeClassReference;

            callBindTo();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(stdClassClass)
            );
        });
    });

    describe('the unwrapper defined', function () {
        var callUnwrapper,
            closure,
            closureReturnValue,
            closureValue,
            coercedThisObject,
            nativeThisObject,
            unwrappedClosure;

        beforeEach(function () {
            coercedThisObject = {};
            closure = sinon.createStubInstance(Closure);
            closureReturnValue = valueFactory.createString('my result native');
            closure.invoke.returns(closureReturnValue);
            nativeThisObject = {};
            sinon.stub(valueFactory, 'coerceObject')
                .withArgs(sinon.match.same(nativeThisObject))
                .returns(coercedThisObject);
            closureValue = sinon.createStubInstance(ObjectValue);
            closureValue.classIs.withArgs('Closure').returns(true);
            closureValue.getClassName.returns('Closure');
            closureValue.getObject.returns(closure);
            closureValue.getType.returns('object');

            callUnwrapper = function () {
                unwrappedClosure = internals.defineUnwrapper.args[0][0].call(closureValue);
            }.bind(this);
        });

        describe('in synchronous mode (when Pausable is not available)', function () {
            it('should push an FFICall onto the stack before the closure is called', function () {
                closure.invoke.callsFake(function () {
                    expect(callStack.push).to.have.been.calledOnce;
                    expect(callStack.push).to.have.been.calledWith(sinon.match.instanceOf(FFICall));

                    return closureReturnValue;
                }.bind(this));
                callUnwrapper();

                unwrappedClosure();

                expect(closure.invoke).to.have.been.calledOnce; // Ensure the assertions above have run
            });

            it('should pop the FFICall off the stack after the closure returns', function () {
                callUnwrapper();

                unwrappedClosure();

                expect(callStack.pop).to.have.been.calledOnce;
            });

            it('should pass the coerced arguments to Closure.invoke(...)', function () {
                callUnwrapper();

                unwrappedClosure(21, 38);

                expect(closure.invoke).to.have.been.calledOnce;
                expect(closure.invoke.args[0][0][0].getNative()).to.equal(21);
                expect(closure.invoke.args[0][0][1].getNative()).to.equal(38);
            });

            it('should coerce the `$this` object to an object', function () {
                callUnwrapper();

                expect(unwrappedClosure).to.be.a('function');
                unwrappedClosure.call(nativeThisObject);
                expect(closure.invoke).to.have.been.calledOnce;
                expect(closure.invoke).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(coercedThisObject)
                );
            });

            it('should return the native value of the result from Closure.invoke(...)', function () {
                callUnwrapper();

                expect(unwrappedClosure()).to.equal('my result native');
            });

            it('should not catch a non-PHP error', function () {
                closure.invoke.throws(new TypeError('A type error occurred'));
                callUnwrapper();

                expect(function () {
                    unwrappedClosure();
                }.bind(this)).to.throw(TypeError, 'A type error occurred');
            });

            it('should coerce a PHP error to a native JS one and rethrow it as that', function () {
                var errorValue = sinon.createStubInstance(ObjectValue);
                errorValue.getType.returns('object');
                errorPromoter.promote
                    .withArgs(sinon.match.same(errorValue))
                    .returns(new Error('My error, coerced from a PHP exception'));
                closure.invoke.throws(errorValue);
                callUnwrapper();

                expect(function () {
                    unwrappedClosure();
                }.bind(this)).to.throw(Error, 'My error, coerced from a PHP exception');
            });
        });

        describe('in asynchronous mode (when Pausable is available)', function () {
            var pausableCall;

            beforeEach(function () {
                pausableCall = sinon.spy(function (func, args, thisObj) {
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
                internals.mode = 'async';
                internals.pausable = {
                    call: pausableCall
                };
            });

            it('should push an FFICall onto the stack before the closure is called', function () {
                closure.invoke.callsFake(function () {
                    expect(callStack.push).to.have.been.calledOnce;
                    expect(callStack.push).to.have.been.calledWith(sinon.match.instanceOf(FFICall));

                    return closureReturnValue;
                }.bind(this));
                callUnwrapper();

                return unwrappedClosure().then(function () {
                    expect(closure.invoke).to.have.been.calledOnce; // Ensure the assertions above have run
                }.bind(this));
            });

            it('should pop the FFICall off the stack after the closure returns', function () {
                callUnwrapper();

                return unwrappedClosure().then(function () {
                    expect(callStack.pop).to.have.been.calledOnce;
                }.bind(this));
            });

            it('should pass the coerced arguments to Closure.invoke(...)', function () {
                callUnwrapper();

                return unwrappedClosure(21, 38).then(function () {
                    expect(closure.invoke).to.have.been.calledOnce;
                    expect(closure.invoke.args[0][0][0].getNative()).to.equal(21);
                    expect(closure.invoke.args[0][0][1].getNative()).to.equal(38);
                }.bind(this));
            });

            it('should coerce the `$this` object to an object', function () {
                callUnwrapper();

                expect(unwrappedClosure).to.be.a('function');
                return unwrappedClosure.call(nativeThisObject).then(function () {
                    expect(closure.invoke).to.have.been.calledOnce;
                    expect(closure.invoke).to.have.been.calledWith(
                        sinon.match.any,
                        sinon.match.same(coercedThisObject)
                    );
                }.bind(this));
            });

            it('should return the native value of the result from Closure.invoke(...)', function () {
                callUnwrapper();

                return expect(unwrappedClosure()).to.eventually.equal('my result native');
            });

            it('should not catch a non-PHP error', function () {
                closure.invoke.throws(new TypeError('A type error occurred'));
                callUnwrapper();

                return expect(unwrappedClosure())
                    .to.eventually.be.rejectedWith(TypeError, 'A type error occurred');
            });

            it('should coerce a PHP error to a native JS one and rethrow it as that', function () {
                var errorValue = sinon.createStubInstance(ObjectValue);
                errorValue.getType.returns('object');
                errorPromoter.promote
                    .withArgs(sinon.match.same(errorValue))
                    .returns(new Error('My error, coerced from a PHP exception'));
                closure.invoke.throws(errorValue);
                callUnwrapper();

                return expect(unwrappedClosure())
                    .to.eventually.be.rejectedWith(Error, 'My error, coerced from a PHP exception');
            });
        });

        describe('in Promise-synchronous mode', function () {
            beforeEach(function () {
                internals.mode = 'psync';
                internals.pausable = null;
            });

            it('should push an FFICall onto the stack before the closure is called', function () {
                closure.invoke.callsFake(function () {
                    expect(callStack.push).to.have.been.calledOnce;
                    expect(callStack.push).to.have.been.calledWith(sinon.match.instanceOf(FFICall));

                    return closureReturnValue;
                }.bind(this));
                callUnwrapper();

                return unwrappedClosure().then(function () {
                    expect(closure.invoke).to.have.been.calledOnce; // Ensure the assertions above have run
                }.bind(this));
            });

            it('should pop the FFICall off the stack after the closure returns', function () {
                callUnwrapper();

                return unwrappedClosure().then(function () {
                    expect(callStack.pop).to.have.been.calledOnce;
                }.bind(this));
            });

            it('should pass the coerced arguments to Closure.invoke(...)', function () {
                callUnwrapper();

                return unwrappedClosure(21, 38).then(function () {
                    expect(closure.invoke).to.have.been.calledOnce;
                    expect(closure.invoke.args[0][0][0].getNative()).to.equal(21);
                    expect(closure.invoke.args[0][0][1].getNative()).to.equal(38);
                }.bind(this));
            });

            it('should coerce the `$this` object to an object', function () {
                callUnwrapper();

                expect(unwrappedClosure).to.be.a('function');
                return unwrappedClosure.call(nativeThisObject).then(function () {
                    expect(closure.invoke).to.have.been.calledOnce;
                    expect(closure.invoke).to.have.been.calledWith(
                        sinon.match.any,
                        sinon.match.same(coercedThisObject)
                    );
                }.bind(this));
            });

            it('should return the native value of the result from Closure.invoke(...)', function () {
                callUnwrapper();

                return expect(unwrappedClosure()).to.eventually.equal('my result native');
            });

            it('should not catch a non-PHP error', function () {
                closure.invoke.throws(new TypeError('A type error occurred'));
                callUnwrapper();

                return expect(unwrappedClosure())
                    .to.eventually.be.rejectedWith(TypeError, 'A type error occurred');
            });

            it('should coerce a PHP error to a native JS one and rethrow it as that', function () {
                var errorValue = sinon.createStubInstance(ObjectValue);
                errorValue.getType.returns('object');
                errorPromoter.promote
                    .withArgs(sinon.match.same(errorValue))
                    .returns(new Error('My error, coerced from a PHP exception'));
                closure.invoke.throws(errorValue);
                callUnwrapper();

                return expect(unwrappedClosure())
                    .to.eventually.be.rejectedWith(Error, 'My error, coerced from a PHP exception');
            });
        });
    });
});
