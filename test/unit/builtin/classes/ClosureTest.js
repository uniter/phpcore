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
    closureClassFactory = require('../../../../src/builtin/classes/Closure'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    tools = require('../../tools'),
    CallFactory = require('../../../../src/CallFactory'),
    CallStack = require('../../../../src/CallStack'),
    Class = require('../../../../src/Class').sync(),
    Closure = require('../../../../src/Closure').sync(),
    ControlScope = require('../../../../src/Control/ControlScope'),
    ErrorPromoter = require('../../../../src/Error/ErrorPromoter'),
    FFICall = require('../../../../src/FFI/Call'),
    Namespace = require('../../../../src/Namespace').sync(),
    NullValue = require('../../../../src/Value/Null').sync(),
    ObjectValue = require('../../../../src/Value/Object').sync();

describe('PHP builtin Closure class', function () {
    var callFactory,
        callStack,
        closureClass,
        controlScope,
        disableAutoCoercion,
        errorPromoter,
        futureFactory,
        globalNamespace,
        InternalClosureClass,
        internals,
        state,
        stdClassClass,
        valueFactory;

    beforeEach(function () {
        callFactory = sinon.createStubInstance(CallFactory);
        callFactory.createFFICall.callsFake(function () {
            return sinon.createStubInstance(FFICall);
        });
        callStack = sinon.createStubInstance(CallStack);
        controlScope = sinon.createStubInstance(ControlScope);
        errorPromoter = sinon.createStubInstance(ErrorPromoter);
        state = tools.createIsolatedState(null, {
            'call_factory': callFactory,
            'call_stack': callStack,
            'control_scope': controlScope,
            'error_promoter': errorPromoter
        });
        futureFactory = state.getFutureFactory();
        globalNamespace = sinon.createStubInstance(Namespace);
        valueFactory = state.getValueFactory();
        disableAutoCoercion = sinon.stub();
        internals = {
            callFactory: callFactory,
            callStack: callStack,
            controlScope: controlScope,
            createPresent: futureFactory.createPresent.bind(futureFactory),
            defineUnwrapper: sinon.stub(),
            disableAutoCoercion: disableAutoCoercion,
            errorPromoter: errorPromoter,
            globalNamespace: globalNamespace,
            mode: 'sync',
            typeInstanceMethod: sinon.stub().callsFake(function (signature, func) {
                return func;
            }),
            typeStaticMethod: sinon.stub().callsFake(function (signature, func) {
                func.isStatic = true;

                return func;
            }),
            valueFactory: valueFactory
        };
        InternalClosureClass = closureClassFactory(internals);
        closureClass = sinon.createStubInstance(Class);
        closureClass.getName.returns('Closure');
        closureClass.instantiateWithInternals.callsFake(function (args, internals) {
            var objectValue = valueFactory.createObject({}, closureClass);

            _.forOwn(internals, function (value, name) {
                objectValue.setInternalProperty(name, value);
            });

            return objectValue;
        });
        stdClassClass = sinon.createStubInstance(Class);
        stdClassClass.getName.returns('stdClass');
        globalNamespace.getClass.withArgs('Closure')
            .returns(futureFactory.createPresent(closureClass));
        globalNamespace.getClass.withArgs('stdClass')
            .returns(futureFactory.createPresent(stdClassClass));
        valueFactory.setGlobalNamespace(globalNamespace);

        controlScope.enterCoroutine.resetHistory();
    });

    describe('static ::bind()', function () {
        var args,
            boundClosure,
            callBind,
            closure,
            closureValue,
            newThisValue,
            scopeClassValue;

        beforeEach(function () {
            closure = sinon.createStubInstance(Closure);
            boundClosure = sinon.createStubInstance(Closure);
            closureValue = sinon.createStubInstance(ObjectValue);
            closureValue.bindClosure.returns(boundClosure);
            closureValue.classIs.withArgs('Closure').returns(true);
            closureValue.getClassName.returns('Closure');
            closureValue.getType.returns('object');
            newThisValue = valueFactory.createObject({}, stdClassClass);
            scopeClassValue = valueFactory.createNull();
            args = [closureValue, newThisValue, scopeClassValue];

            callBind = function () {
                return InternalClosureClass.prototype.bind.apply(null, args);
            };
        });

        it('should return a Closure ObjectValue with the bound closure', async function () {
            var result = await callBind().toPromise();

            expect(result).to.be.an.instanceOf(ObjectValue);
            expect(result.getInternalProperty('closure')).to.equal(boundClosure);
            expect(result.getClass()).to.equal(closureClass);
        });

        it('should allow `null` as `$this` object, for creating an unbound closure', async function () {
            newThisValue = valueFactory.createNull();
            args[1] = newThisValue;

            await callBind().toPromise();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure.args[0][0]).to.be.an.instanceOf(NullValue);
        });

        it('should use the class of the `$this` object as scope class if not specified', async function () {
            await callBind().toPromise();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(stdClassClass)
            );
        });

        it('should use the class of the `$this` object as scope class if "static" is specified', async function () {
            scopeClassValue = valueFactory.createString('static');
            args[2] = scopeClassValue;

            await callBind().toPromise();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(stdClassClass)
            );
        });

        it('should autoload and use a specified class as scope class', async function () {
            var myClassClass = sinon.createStubInstance(Class);
            globalNamespace.getClass.withArgs('My\\Stuff\\MyClass')
                // Use an async future to ensure we handle pauses correctly.
                .returns(futureFactory.createAsyncPresent(myClassClass));
            scopeClassValue = valueFactory.createString('My\\Stuff\\MyClass');
            args[2] = scopeClassValue;

            await callBind().toPromise();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(myClassClass)
            );
        });

        it('should use the class of the scope class object as scope class if an object is specified', async function () {
            scopeClassValue = valueFactory.createObject({}, stdClassClass);
            args[2] = scopeClassValue;

            await callBind().toPromise();

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
            newThisValue,
            scopeClassValue;

        beforeEach(function () {
            closure = sinon.createStubInstance(Closure);
            boundClosure = sinon.createStubInstance(Closure);
            closureValue = sinon.createStubInstance(ObjectValue);
            closureValue.bindClosure.returns(boundClosure);
            closureValue.classIs.withArgs('Closure').returns(true);
            closureValue.getClassName.returns('Closure');
            closureValue.getType.returns('object');
            newThisValue = valueFactory.createObject({}, stdClassClass);
            scopeClassValue = valueFactory.createNull();
            args = [newThisValue, scopeClassValue];

            callBindTo = function () {
                return InternalClosureClass.prototype.bindTo.apply(closureValue, args);
            };
        });

        it('should return a Closure ObjectValue with the bound closure', async function () {
            var result = await callBindTo().toPromise();

            expect(result).to.be.an.instanceOf(ObjectValue);
            expect(result.getInternalProperty('closure')).to.equal(boundClosure);
            expect(result.getClass()).to.equal(closureClass);
        });

        it('should allow `null` as `$this` object, for creating an unbound closure', async function () {
            newThisValue = valueFactory.createNull();
            args[0] = newThisValue;

            await callBindTo().toPromise();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure.args[0][0]).to.be.an.instanceOf(NullValue);
        });

        it('should use the class of the `$this` object as scope class if not specified', async function () {
            await callBindTo().toPromise();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(stdClassClass)
            );
        });

        it('should use the class of the `$this` object as scope class if "static" is specified', async function () {
            scopeClassValue = valueFactory.createString('static');
            args[1] = scopeClassValue;

            await callBindTo().toPromise();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(stdClassClass)
            );
        });

        it('should autoload and use a specified class as scope class', async function () {
            var myClassClass = sinon.createStubInstance(Class);
            globalNamespace.getClass.withArgs('My\\Stuff\\MyClass')
                // Use an async future to ensure we handle pauses correctly.
                .returns(futureFactory.createAsyncPresent(myClassClass));
            scopeClassValue = valueFactory.createString('My\\Stuff\\MyClass');
            args[1] = scopeClassValue;

            await callBindTo().toPromise();

            expect(closureValue.bindClosure).to.have.been.calledOnce;
            expect(closureValue.bindClosure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(myClassClass)
            );
        });

        it('should use the class of the scope class object as scope class if an object is specified', async function () {
            scopeClassValue = valueFactory.createObject({}, stdClassClass);
            args[1] = scopeClassValue;

            await callBindTo().toPromise();

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
            closureReturnValue = valueFactory.createAsyncPresent('my result native');
            closure.invoke.returns(closureReturnValue);
            nativeThisObject = {};
            sinon.stub(valueFactory, 'coerceObject')
                .withArgs(sinon.match.same(nativeThisObject))
                .returns(coercedThisObject);
            closureValue = valueFactory.createObject({}, closureClass);
            closureValue.setInternalProperty('closure', closure);

            callUnwrapper = function () {
                unwrappedClosure = internals.defineUnwrapper.args[0][0].call(closureValue, closureValue);
            };
        });

        describe('in synchronous mode', function () {
            it('should have the inbound stack marker as its name for stack cleaning', function () {
                callUnwrapper();

                expect(unwrappedClosure.name).to.equal('__uniterInboundStackMarker__');
            });

            it('should push an FFICall onto the stack before the closure is called', function () {
                closure.invoke.callsFake(function () {
                    expect(callStack.push).to.have.been.calledOnce;
                    expect(callStack.push).to.have.been.calledWith(sinon.match.instanceOf(FFICall));

                    return closureReturnValue;
                });
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
                closure.invoke.returns(valueFactory.createRejection(new TypeError('A type error occurred')));
                callUnwrapper();

                expect(function () {
                    unwrappedClosure();
                }).to.throw(TypeError, 'A type error occurred');
            });

            it('should coerce a PHP error to a native JS one and rethrow it as that', function () {
                var errorValue = sinon.createStubInstance(ObjectValue);
                errorValue.getType.returns('object');
                errorPromoter.promote
                    .withArgs(sinon.match.same(errorValue))
                    .returns(new Error('My error, coerced from a PHP exception'));
                closure.invoke.returns(valueFactory.createRejection(errorValue));
                callUnwrapper();

                expect(function () {
                    unwrappedClosure();
                }).to.throw(Error, 'My error, coerced from a PHP exception');
            });
        });

        describe('in asynchronous mode', function () {
            beforeEach(function () {
                internals.mode = 'async';
            });

            it('should push an FFICall onto the stack before the closure is called', function () {
                closure.invoke.callsFake(function () {
                    expect(callStack.push).to.have.been.calledOnce;
                    expect(callStack.push).to.have.been.calledWith(sinon.match.instanceOf(FFICall));

                    return closureReturnValue;
                });
                callUnwrapper();

                return unwrappedClosure().then(function () {
                    expect(closure.invoke).to.have.been.calledOnce; // Ensure the assertions above have run
                });
            });

            it('should enter a new Coroutine before the closure is called', async function () {
                callUnwrapper();

                await unwrappedClosure();

                expect(controlScope.enterCoroutine).to.have.been.calledOnce;
                expect(controlScope.enterCoroutine).to.have.been.calledBefore(closure.invoke);
            });

            it('should pop the FFICall off the stack after the closure returns', function () {
                callUnwrapper();

                return unwrappedClosure().then(function () {
                    expect(callStack.pop).to.have.been.calledOnce;
                });
            });

            it('should pass the coerced arguments to Closure.invoke(...)', function () {
                callUnwrapper();

                return unwrappedClosure(21, 38).then(function () {
                    expect(closure.invoke).to.have.been.calledOnce;
                    expect(closure.invoke.args[0][0][0].getNative()).to.equal(21);
                    expect(closure.invoke.args[0][0][1].getNative()).to.equal(38);
                });
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
                });
            });

            it('should return the native value of the result from Closure.invoke(...)', function () {
                callUnwrapper();

                return expect(unwrappedClosure()).to.eventually.equal('my result native');
            });

            it('should not catch a non-PHP error', function () {
                closure.invoke.returns(valueFactory.createRejection(new TypeError('A type error occurred')));
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
                closure.invoke.returns(valueFactory.createRejection(errorValue));
                callUnwrapper();

                return expect(unwrappedClosure())
                    .to.eventually.be.rejectedWith(Error, 'My error, coerced from a PHP exception');
            });
        });

        describe('in Promise-synchronous mode', function () {
            beforeEach(function () {
                internals.mode = 'psync';
            });

            it('should push an FFICall onto the stack before the closure is called', function () {
                closure.invoke.callsFake(function () {
                    expect(callStack.push).to.have.been.calledOnce;
                    expect(callStack.push).to.have.been.calledWith(sinon.match.instanceOf(FFICall));

                    return closureReturnValue;
                });
                callUnwrapper();

                return unwrappedClosure().then(function () {
                    expect(closure.invoke).to.have.been.calledOnce; // Ensure the assertions above have run
                });
            });

            it('should pop the FFICall off the stack after the closure returns', function () {
                callUnwrapper();

                return unwrappedClosure().then(function () {
                    expect(callStack.pop).to.have.been.calledOnce;
                });
            });

            it('should pass the coerced arguments to Closure.invoke(...)', function () {
                callUnwrapper();

                return unwrappedClosure(21, 38).then(function () {
                    expect(closure.invoke).to.have.been.calledOnce;
                    expect(closure.invoke.args[0][0][0].getNative()).to.equal(21);
                    expect(closure.invoke.args[0][0][1].getNative()).to.equal(38);
                });
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
                });
            });

            it('should return the native value of the result from Closure.invoke(...)', function () {
                callUnwrapper();

                return expect(unwrappedClosure()).to.eventually.equal('my result native');
            });

            it('should not catch a non-PHP error', function () {
                closure.invoke.returns(valueFactory.createRejection(new TypeError('A type error occurred')));
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
                closure.invoke.returns(valueFactory.createRejection(errorValue));
                callUnwrapper();

                return expect(unwrappedClosure())
                    .to.eventually.be.rejectedWith(Error, 'My error, coerced from a PHP exception');
            });
        });
    });
});
