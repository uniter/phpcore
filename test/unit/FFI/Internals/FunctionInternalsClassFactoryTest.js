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
    FunctionInternalsClassFactory = require('../../../../src/FFI/Internals/FunctionInternalsClassFactory'),
    FFIFactory = require('../../../../src/FFI/FFIFactory'),
    Internals = require('../../../../src/FFI/Internals/Internals'),
    Namespace = require('../../../../src/Namespace').sync(),
    NamespaceScope = require('../../../../src/NamespaceScope').sync(),
    Signature = require('../../../../src/Function/Signature/Signature'),
    SignatureParser = require('../../../../src/Function/Signature/SignatureParser'),
    ValueCoercer = require('../../../../src/FFI/Value/ValueCoercer'),
    ValueFactory = require('../../../../src/ValueFactory').sync(),
    ValueStorage = require('../../../../src/FFI/Value/ValueStorage');

describe('FFI FunctionInternalsClassFactory', function () {
    var baseInternals,
        factory,
        ffiFactory,
        globalNamespace,
        globalNamespaceScope,
        signatureParser,
        valueCoercer,
        valueFactory,
        valueStorage;

    beforeEach(function () {
        baseInternals = sinon.createStubInstance(Internals);
        ffiFactory = sinon.createStubInstance(FFIFactory);
        globalNamespace = sinon.createStubInstance(Namespace);
        globalNamespaceScope = sinon.createStubInstance(NamespaceScope);
        signatureParser = sinon.createStubInstance(SignatureParser);
        valueCoercer = null; // Created by the .createValueCoercer() stub below
        valueStorage = sinon.createStubInstance(ValueStorage);
        valueFactory = new ValueFactory(null, null, null, null, null, null, valueStorage);

        ffiFactory.createValueCoercer.callsFake(function () {
            valueCoercer = sinon.createStubInstance(ValueCoercer);

            return valueCoercer;
        });

        factory = new FunctionInternalsClassFactory(
            baseInternals,
            valueFactory,
            ffiFactory,
            globalNamespace,
            globalNamespaceScope,
            signatureParser
        );
    });

    describe('create()', function () {
        var FunctionInternals;

        beforeEach(function () {
            FunctionInternals = factory.create();
        });

        it('should return a FunctionInternals class constructor function', function () {
            expect(FunctionInternals).to.be.a('function');
        });

        describe('the FunctionInternals class returned', function () {
            var definitionFactory,
                functionInternals,
                myStuffNamespace,
                nativeFunction;

            beforeEach(function () {
                functionInternals = new FunctionInternals('My\\Stuff\\myFunc');
                definitionFactory = sinon.stub();
                nativeFunction = sinon.stub();
                myStuffNamespace = sinon.createStubInstance(Namespace);

                definitionFactory
                    .withArgs(sinon.match.same(functionInternals))
                    .returns(nativeFunction);

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

                it('should define an untyped function in the Namespace', function () {
                    functionInternals.defineFunction(definitionFactory);

                    expect(myStuffNamespace.defineFunction).to.have.been.calledOnce;
                    expect(myStuffNamespace.defineFunction).to.have.been.calledWith(
                        'myFunc',
                        sinon.match.func, // A further wrapper: __uniterOutboundStackMarker__
                        sinon.match.same(globalNamespaceScope),
                        null
                    );
                });

                it('should define a typed function in the Namespace', function () {
                    var parametersSpecData = [{name: 'param1'}, {name: 'param2'}],
                        signature = sinon.createStubInstance(Signature);
                    signature.getParametersSpecData.returns(parametersSpecData);
                    signatureParser.parseSignature
                        .withArgs('mixed $param1, mixed $param2')
                        .returns(signature);
                    // Defining a signature will make it a typed function.
                    functionInternals.defineSignature('mixed $param1, mixed $param2');

                    functionInternals.defineFunction(definitionFactory);

                    expect(myStuffNamespace.defineFunction).to.have.been.calledOnce;
                    expect(myStuffNamespace.defineFunction).to.have.been.calledWith(
                        'myFunc',
                        sinon.match.func, // A further wrapper: __uniterOutboundStackMarker__
                        sinon.match.same(globalNamespaceScope),
                        sinon.match.same(parametersSpecData)
                    );
                });

                describe('the wrapper function', function () {
                    var callDefineFunction,
                        wrapperFunction;

                    beforeEach(function () {
                        callDefineFunction = function () {
                            functionInternals.defineFunction(definitionFactory);
                            wrapperFunction = myStuffNamespace.defineFunction.args[0][1];
                        };
                    });

                    it('should have the outbound stack marker as its name for stack cleaning', function () {
                        callDefineFunction();

                        expect(wrapperFunction.name).to.equal('__uniterOutboundStackMarker__');
                    });

                    it('should call the native function with the FunctionInternals as context', function () {
                        callDefineFunction();
                        valueCoercer.coerceArguments
                            .withArgs([])
                            .returns([]);

                        wrapperFunction();

                        expect(nativeFunction).to.have.been.calledOnce;
                        expect(nativeFunction).to.have.been.calledOn(sinon.match.same(functionInternals));
                    });

                    it('should call the native function with arguments coerced via the ValueCoercer', function () {
                        var coercedArg1 = valueFactory.createInteger(21),
                            coercedArg2 = valueFactory.createString('second arg'),
                            resultValue = valueFactory.createString('my result');
                        callDefineFunction();
                        valueCoercer.coerceArguments
                            .withArgs(sinon.match(function (args) {
                                return args[0] === 21 && args[1] === 'second arg';
                            }))
                            .returns([coercedArg1, coercedArg2]);
                        nativeFunction
                            .withArgs(coercedArg1, coercedArg2)
                            .returns(resultValue);

                        expect(wrapperFunction(21, 'second arg')).to.equal(resultValue);
                    });
                });
            });
        });
    });
});
