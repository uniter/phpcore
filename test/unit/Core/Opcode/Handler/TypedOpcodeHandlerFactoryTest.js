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
    tools = require('../../../tools'),
    CallStack = require('../../../../../src/CallStack'),
    Exception = phpCommon.Exception,
    OpcodeHandlerFactory = require('../../../../../src/Core/Opcode/Handler/OpcodeHandlerFactory'),
    OpcodeSignature = require('../../../../../src/Core/Opcode/Signature/Signature'),
    Parameter = require('../../../../../src/Core/Opcode/Parameter/Parameter'),
    TypedOpcodeHandlerFactory = require('../../../../../src/Core/Opcode/Handler/TypedOpcodeHandlerFactory');

describe('TypedOpcodeHandlerFactory', function () {
    var callStack,
        controlBridge,
        factory,
        futureFactory,
        opcodeHandlerFactory,
        state;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        controlBridge = state.getControlBridge();
        futureFactory = state.getFutureFactory();
        opcodeHandlerFactory = sinon.createStubInstance(OpcodeHandlerFactory);

        opcodeHandlerFactory.createTracedHandler
            .withArgs(sinon.match.any, 'my_fetcher_type')
            .returnsArg(0);

        factory = new TypedOpcodeHandlerFactory(
            controlBridge,
            opcodeHandlerFactory
        );
    });

    describe('typeHandler()', function () {
        var callTypeHandler,
            handler,
            signature,
            typedHandler;

        beforeEach(function () {
            signature = sinon.createStubInstance(OpcodeSignature);
            signature.hasVariadicParameter.returns(false);
            signature.getParameterCount.returns(0);
            signature.getParameters.returns([]);
            signature.coerceReturnValue.returnsArg(0);

            handler = sinon.stub();

            callTypeHandler = function () {
                typedHandler = factory.typeHandler(signature, handler, 'my_fetcher_type');
            };
        });

        describe('the handler function returned', function () {
            describe('with no parameters', function () {
                it('should invoke the wrapped handler with no args', function () {
                    callTypeHandler();

                    typedHandler();

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly();
                });

                it('should coerce the result via the Signature to apply its return type', function () {
                    handler.returns('my original result');
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(typedHandler()).to.equal('my coerced result');
                });

                it('should await the result before coercing if it is a Future', async function () {
                    handler.returns(futureFactory.createPresent('my original result'));
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(await typedHandler().toPromise()).to.equal('my coerced result');
                });
            });

            describe('with one formal parameter', function () {
                var parameter;

                beforeEach(function () {
                    parameter = sinon.createStubInstance(Parameter);
                    parameter.isVariadic.returns(false);
                    parameter.coerceArgument
                        .withArgs('hello')
                        .returns('world');

                    signature.getParameterCount.returns(1);
                    signature.getParameters.returns([parameter]);
                });

                it('should invoke the wrapped handler with one argument', function () {
                    callTypeHandler();

                    typedHandler('hello');

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly('world');
                });

                it('should await the coerced argument if it is a Future', async function () {
                    parameter.coerceArgument
                        .withArgs('hello')
                        .returns(futureFactory.createAsyncPresent('world'));
                    handler.returns('my original result');
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(await typedHandler('hello').toPromise())
                        .to.equal('my coerced result');
                });

                it('should coerce the result via the Signature to apply its return type', function () {
                    handler.returns('my original result');
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(typedHandler('hello')).to.equal('my coerced result');
                });

                it('should await the result before coercing if it is a Future', async function () {
                    handler.returns(futureFactory.createAsyncPresent('my original result'));
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(await typedHandler('hello').toPromise()).to.equal('my coerced result');
                });

                it('should throw when a second argument is provided initially', function () {
                    callTypeHandler();

                    expect(function () {
                        typedHandler('first', 'second');
                    }).to.throw(
                        Exception,
                        'Too many opcode arguments provided - expected 1, got 2'
                    );
                });

                it('should throw when formal partial argument capture handler is given multiple arguments', function () {
                    callTypeHandler();

                    expect(function () {
                        typedHandler()('first', 'second');
                    }).to.throw(
                        Exception,
                        'Only one partial argument may be provided at a time'
                    );
                });
            });

            describe('with one formal and one variadic parameter', function () {
                var parameter1,
                    parameter2;

                beforeEach(function () {
                    signature.hasVariadicParameter.returns(true);
                    parameter1 = sinon.createStubInstance(Parameter);
                    parameter1.isVariadic.returns(false);
                    parameter1.coerceArgument
                        .withArgs('hello')
                        .returns('world');
                    parameter2 = sinon.createStubInstance(Parameter);
                    parameter2.isVariadic.returns(true);
                    parameter2.coerceArgument
                        .withArgs('foo')
                        .returns('bar');
                    parameter2.coerceArgument
                        .withArgs('here')
                        .returns('there');
                    parameter2.coerceArgument
                        .returnsArg(0);

                    signature.getParameterCount.returns(2);
                    signature.getParameters.returns([parameter1, parameter2]);
                });

                it('should invoke the wrapped handler with two arguments when two given', function () {
                    callTypeHandler();

                    typedHandler('hello')('foo')();

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly('world', ['bar']);
                });

                it('should invoke the wrapped handler with three arguments when three given', function () {
                    callTypeHandler();

                    typedHandler('hello')('foo')('here')();

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly('world', ['bar', 'there']);
                });

                it('should await the coerced argument if it is a Future', async function () {
                    handler.returns('my original result');
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(
                        (
                            await typedHandler('hello')(futureFactory.createAsyncPresent('foo'))
                                .toPromise()
                        )
                        ('here')
                        ()
                    )
                        .to.equal('my coerced result');
                });

                it('should coerce the result via the Signature to apply its return type', function () {
                    handler.returns('my original result');
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(typedHandler('hello')()).to.equal('my coerced result');
                });

                it('should await the result before coercing if it is a Future', async function () {
                    handler.returns(futureFactory.createAsyncPresent('my original result'));
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(await typedHandler('hello')().toPromise()).to.equal('my coerced result');
                });

                it('should throw when a second argument is provided initially', function () {
                    callTypeHandler();

                    expect(function () {
                        typedHandler('first', 'second');
                    }).to.throw(
                        Exception,
                        'Variadic opcode arguments should be provided separately'
                    );
                });

                it('should throw when formal partial argument capture handler is given multiple arguments', function () {
                    callTypeHandler();

                    expect(function () {
                        typedHandler()('first', 'second');
                    }).to.throw(
                        Exception,
                        'Only one partial argument may be provided at a time'
                    );
                });
            });
        });
    });
});
