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
    tools = require('../tools'),
    NativeMethodDefinitionBuilder = require('../../../src/OOP/NativeMethodDefinitionBuilder'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    Scope = require('../../../src/Scope').sync(),
    Signature = require('../../../src/Function/Signature/Signature'),
    SignatureParser = require('../../../src/Function/Signature/SignatureParser'),
    TypedFunction = require('../../../src/Function/TypedFunction'),
    ValueCoercer = require('../../../src/FFI/Value/ValueCoercer');

describe('NativeMethodDefinitionBuilder', function () {
    var builder,
        futureFactory,
        signatureParser,
        state,
        valueCoercer,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        signatureParser = sinon.createStubInstance(SignatureParser);
        valueCoercer = sinon.createStubInstance(ValueCoercer);
        valueFactory = state.getValueFactory();

        valueCoercer.coerceArguments.callsFake(function (argReferences) {
            return futureFactory.createAsyncPresent(
                argReferences.map(function (argReference) {
                    return argReference.getNative();
                })
            );
        });
        valueCoercer.isAutoCoercionEnabled.returns(false);

        builder = new NativeMethodDefinitionBuilder(signatureParser);
    });

    describe('buildMethod()', function () {
        describe('when the method is defined with a TypedFunction', function () {
            var func,
                method,
                signature;

            beforeEach(function () {
                func = sinon.stub();
                method = new TypedFunction('My signature', func);
                signature = sinon.createStubInstance(Signature);

                signatureParser.parseSignature
                    .withArgs('My signature')
                    .returns(signature);

                signature.getParametersSpecData.returns([{param: 'one'}, {param: 'two'}]);
                signature.getReturnTypeSpecData.returns({my: 'return type'});
                signature.isReturnByReference.returns(true);
            });

            it('should return a definition with the correct non-"method" properties when instance', function () {
                var definition = builder.buildMethod(method, valueCoercer);

                expect(definition.line).to.be.null;
                expect(definition.isStatic).to.be.false;
                expect(definition.ref).to.be.true;
                expect(definition.ret).to.deep.equal({my: 'return type'});
            });

            it('should return a definition with the correct non-"method" properties when static', function () {
                var definition;
                func.isStatic = this;

                definition = builder.buildMethod(method, valueCoercer);

                expect(definition.line).to.be.null;
                expect(definition.isStatic).to.be.true;
                expect(definition.ref).to.be.true;
                expect(definition.ret).to.deep.equal({my: 'return type'});
            });

            it('should return a definition with a "method" property containing a function', function () {
                var definition = builder.buildMethod(method, valueCoercer);

                expect(definition.method).to.be.a('function');
            });

            describe('the method property of the definition returned', function () {
                var arg1,
                    arg2,
                    callBuildMethod,
                    nativeThisObject,
                    scope,
                    thisObject;

                beforeEach(function () {
                    arg1 = valueFactory.createString('first arg');
                    arg2 = valueFactory.createString('second arg');
                    nativeThisObject = {my: 'native object'};
                    scope = sinon.createStubInstance(Scope);
                    thisObject = sinon.createStubInstance(ObjectValue);

                    func.returns('my result');
                    scope.getThisObject.returns(thisObject);
                    thisObject.getObject.returns(nativeThisObject);

                    callBuildMethod = function () {
                        return builder.buildMethod(method, valueCoercer).method;
                    };
                });

                it('should call the wrapped method on the this object when non-coercing', async function () {
                    var method = callBuildMethod();

                    await method.apply(scope, [arg1, arg2]).toPromise();

                    expect(func).to.have.been.calledOnce;
                    expect(func).to.have.been.calledOn(sinon.match.same(thisObject));
                });

                it('should call the wrapped method on the native object when auto-coercing', async function () {
                    var method;
                    valueCoercer.isAutoCoercionEnabled.returns(true);
                    method = callBuildMethod();

                    await method.apply(scope, [arg1, arg2]).toPromise();

                    expect(func).to.have.been.calledOnce;
                    expect(func).to.have.been.calledOn(sinon.match.same(nativeThisObject));
                });

                it('should coerce the arguments via ValueCoercer', async function () {
                    var method = callBuildMethod();

                    await method.apply(scope, [arg1, arg2]).toPromise();

                    expect(func).to.have.been.calledOnce;
                    expect(func).to.have.been.calledWith('first arg', 'second arg');
                });
            });
        });

        describe('when the method is defined with a normal JS function', function () {
            var func;

            beforeEach(function () {
                func = sinon.stub();
            });

            it('should return a definition with the correct non-"method" properties when instance', function () {
                var definition = builder.buildMethod(func, valueCoercer);

                expect(definition.line).to.be.null;
                expect(definition.isStatic).to.be.false;
                expect(definition.ref).to.be.false;
                expect(definition.ret).to.be.null;
            });

            it('should return a definition with the correct non-"method" properties when static', function () {
                var definition;
                func.isStatic = true;

                definition = builder.buildMethod(func, valueCoercer);

                expect(definition.line).to.be.null;
                expect(definition.isStatic).to.be.true;
                expect(definition.ref).to.be.false;
                expect(definition.ret).to.be.null;
            });

            it('should return a definition with a "method" property containing a function', function () {
                var definition = builder.buildMethod(func, valueCoercer);

                expect(definition.method).to.be.a('function');
            });

            describe('the method property of the definition returned', function () {
                var arg1,
                    arg2,
                    callBuildMethod,
                    nativeThisObject,
                    scope,
                    thisObject;

                beforeEach(function () {
                    arg1 = valueFactory.createString('first arg');
                    arg2 = valueFactory.createString('second arg');
                    nativeThisObject = {my: 'native object'};
                    scope = sinon.createStubInstance(Scope);
                    thisObject = sinon.createStubInstance(ObjectValue);

                    func.returns('my result');
                    scope.getThisObject.returns(thisObject);
                    thisObject.getObject.returns(nativeThisObject);

                    callBuildMethod = function () {
                        return builder.buildMethod(func, valueCoercer).method;
                    };
                });

                it('should call the wrapped method on the this object when non-coercing', async function () {
                    var method = callBuildMethod();

                    await method.apply(scope, [arg1, arg2]).toPromise();

                    expect(func).to.have.been.calledOnce;
                    expect(func).to.have.been.calledOn(sinon.match.same(thisObject));
                });

                it('should call the wrapped method on the native object when auto-coercing', async function () {
                    var method;
                    valueCoercer.isAutoCoercionEnabled.returns(true);
                    method = callBuildMethod();

                    await method.apply(scope, [arg1, arg2]).toPromise();

                    expect(func).to.have.been.calledOnce;
                    expect(func).to.have.been.calledOn(sinon.match.same(nativeThisObject));
                });

                it('should coerce the arguments via ValueCoercer', async function () {
                    var method = callBuildMethod();

                    await method.apply(scope, [arg1, arg2]).toPromise();

                    expect(func).to.have.been.calledOnce;
                    expect(func).to.have.been.calledWith('first arg', 'second arg');
                });
            });
        });

        describe('when the value given is not a JS function or TypedFunction', function () {
            it('should return null', function () {
                expect(builder.buildMethod('I am not a method', valueCoercer)).to.be.null;
            });
        });
    });
});
