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
    tools = require('../../tools'),
    FFIFactory = require('../../../../src/FFI/FFIFactory'),
    Future = require('../../../../src/Control/Future'),
    Internals = require('../../../../src/FFI/Internals/Internals'),
    Namespace = require('../../../../src/Namespace').sync(),
    NamespaceScope = require('../../../../src/NamespaceScope').sync(),
    OverloadedFunctionInternalsClassFactory = require('../../../../src/FFI/Internals/OverloadedFunctionInternalsClassFactory'),
    OverloadedFunctionVariant = require('../../../../src/Function/Overloaded/OverloadedFunctionVariant'),
    Signature = require('../../../../src/Function/Signature/Signature'),
    SignatureParser = require('../../../../src/Function/Signature/SignatureParser'),
    ValueCoercer = require('../../../../src/FFI/Value/ValueCoercer');

describe('FFI OverloadedFunctionInternalsClassFactory', function () {
    var baseInternals,
        factory,
        ffiFactory,
        futureFactory,
        globalNamespace,
        globalNamespaceScope,
        signatureParser,
        state,
        valueCoercer,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        baseInternals = sinon.createStubInstance(Internals);
        ffiFactory = sinon.createStubInstance(FFIFactory);
        futureFactory = state.getFutureFactory();
        globalNamespace = sinon.createStubInstance(Namespace);
        globalNamespaceScope = sinon.createStubInstance(NamespaceScope);
        signatureParser = sinon.createStubInstance(SignatureParser);
        valueCoercer = null; // Created by the .createValueCoercer() stub below
        valueFactory = state.getValueFactory();

        ffiFactory.createValueCoercer.callsFake(function () {
            valueCoercer = sinon.createStubInstance(ValueCoercer);

            valueCoercer.coerceArguments.callsFake(function (argReferences) {
                return futureFactory.createAsyncPresent(
                    Array.from(argReferences).map(function (argReference) {
                        return argReference.getNative();
                    })
                );
            });

            return valueCoercer;
        });

        signatureParser.parseSignature.callsFake(function (signatureString) {
            var signature = sinon.createStubInstance(Signature);

            signature.getParameterCount.returns(signatureString.match(/\$/g).length);

            return signature;
        });

        factory = new OverloadedFunctionInternalsClassFactory(
            baseInternals,
            valueFactory,
            ffiFactory,
            globalNamespace,
            globalNamespaceScope,
            signatureParser
        );
    });

    describe('create()', function () {
        var OverloadedFunctionInternals;

        beforeEach(function () {
            OverloadedFunctionInternals = factory.create();
        });

        it('should return an OverloadedFunctionInternals class constructor function', function () {
            expect(OverloadedFunctionInternals).to.be.a('function');
        });

        describe('the OverloadedFunctionInternals class returned', function () {
            var definitionFactory,
                functionInternals,
                myStuffNamespace,
                variant1NativeFunction,
                variant2NativeFunction;

            beforeEach(function () {
                functionInternals = new OverloadedFunctionInternals('My\\Stuff\\myFunc');
                variant1NativeFunction = sinon.stub();
                variant2NativeFunction = sinon.stub();
                definitionFactory = function (overloadedInternals) {
                    overloadedInternals.defineVariant('int $onlyParam: int', variant1NativeFunction);
                    overloadedInternals.defineVariant('int $param1, int $param2: int', variant1NativeFunction);
                };
                myStuffNamespace = sinon.createStubInstance(Namespace);

                globalNamespace.parseName
                    .withArgs('My\\Stuff\\myFunc')
                    .returns({
                        namespace: myStuffNamespace,
                        name: 'myFunc'
                    });
            });

            describe('defineFunction()', function () {
                it('should enable auto-coercion by default', function () {
                    functionInternals.defineFunction(definitionFactory);

                    expect(ffiFactory.createValueCoercer).to.have.been.calledOnce;
                    expect(ffiFactory.createValueCoercer).to.have.been.calledWith(true);
                });

                it('should disable auto-coercion when disabled', function () {
                    functionInternals.disableAutoCoercion();

                    functionInternals.defineFunction(definitionFactory);

                    expect(ffiFactory.createValueCoercer).to.have.been.calledOnce;
                    expect(ffiFactory.createValueCoercer).to.have.been.calledWith(false);
                });

                it('should define the overloaded function in the Namespace', function () {
                    var variants;

                    functionInternals.defineFunction(definitionFactory);

                    expect(myStuffNamespace.defineOverloadedFunction).to.have.been.calledOnce;
                    expect(myStuffNamespace.defineOverloadedFunction).to.have.been.calledWith(
                        'myFunc',
                        sinon.match.array, // Variants.
                        sinon.match.same(globalNamespaceScope),
                    );
                    variants = myStuffNamespace.defineOverloadedFunction.args[0][1];
                    expect(variants).to.have.length(2);
                    expect(variants[0]).to.be.an.instanceOf(OverloadedFunctionVariant);
                    expect(variants[0].getFunction()).to.be.a('function'); // See describe block below.
                    expect(variants[0].getSignature()).to.be.an.instanceOf(Signature);
                    expect(variants[0].getSignature().getParameterCount()).to.equal(1);
                });

                describe('the variant wrapper function', function () {
                    var callDefineFunction,
                        variants,
                        variantWrapperFunction;

                    beforeEach(function () {
                        callDefineFunction = function () {
                            functionInternals.defineFunction(definitionFactory);
                            variants = myStuffNamespace.defineOverloadedFunction.args[0][1];
                            variantWrapperFunction = variants[0].getFunction();
                        };
                    });

                    it('should have the outbound stack marker as its name for stack cleaning', async function () {
                        var future = sinon.createStubInstance(Future);
                        callDefineFunction();
                        valueCoercer.coerceArguments
                            .returns(future);

                        variantWrapperFunction();

                        expect(future.next.args[0][0]).to.be.a('function');
                        expect(future.next.args[0][0].name).to.equal('__uniterOutboundStackMarker__');
                    });

                    it('should call the native function with the FunctionInternals as context', async function () {
                        callDefineFunction();

                        await variantWrapperFunction().toPromise();

                        expect(variant1NativeFunction).to.have.been.calledOnce;
                        expect(variant1NativeFunction).to.have.been.calledOn(sinon.match.same(functionInternals));
                    });

                    it('should call the native function with arguments coerced via the ValueCoercer', async function () {
                        var coercedArg1 = valueFactory.createInteger(21),
                            coercedArg2 = valueFactory.createString('second arg'),
                            resultValue = valueFactory.createString('my result');
                        callDefineFunction();
                        valueCoercer.coerceArguments
                            .withArgs(sinon.match(function (args) {
                                return args[0] === 21 && args[1] === 'second arg';
                            }))
                            .returns(futureFactory.createAsyncPresent([coercedArg1, coercedArg2]));
                        variant1NativeFunction
                            .withArgs(coercedArg1, coercedArg2)
                            .returns(resultValue);

                        expect(await variantWrapperFunction(21, 'second arg').toPromise()).to.equal(resultValue);
                    });
                });
            });
        });
    });
});
