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
    OpcodeSignature = require('../../../../../src/Core/Opcode/Signature/Signature'),
    Parameter = require('../../../../../src/Core/Opcode/Parameter/Parameter'),
    TypedOpcodeHandlerFactory = require('../../../../../src/Core/Opcode/Handler/TypedOpcodeHandlerFactory');

describe('TypedOpcodeHandlerFactory', function () {
    var callStack,
        controlBridge,
        factory,
        futureFactory,
        state;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        controlBridge = state.getControlBridge();
        futureFactory = state.getFutureFactory();

        factory = new TypedOpcodeHandlerFactory(controlBridge);
    });

    describe('typeHandler()', function () {
        var callTypeHandler,
            handler,
            signature,
            typedHandler;

        beforeEach(function () {
            signature = sinon.createStubInstance(OpcodeSignature);
            signature.coerceReturnValue.returnsArg(0);
            signature.getParameterCount.returns(0);
            signature.getParameters.returns([]);
            signature.hasVariadicParameter.returns(false);

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
                    parameter.coerceArgument
                        .withArgs('hello')
                        .returns('world');
                    parameter.getDefaultArgument.returns('my default');
                    parameter.getName.returns('my_param');
                    parameter.isRequired.returns(false);
                    parameter.isVariadic.returns(false);

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

                it('should throw when a second argument is provided', function () {
                    callTypeHandler();

                    expect(function () {
                        typedHandler('first', 'second');
                    }).to.throw(
                        Exception,
                        'Too many opcode arguments provided - expected 1, got 2'
                    );
                });

                it('should throw when no arguments are passed but the parameter is required', function () {
                    parameter.isRequired.returns(true);

                    callTypeHandler();

                    expect(function () {
                        typedHandler();
                    }).to.throw(
                        Exception,
                        'Missing argument for required parameter "my_param"'
                    );
                });
            });

            describe('with two formal parameters', function () {
                var parameter1,
                    parameter2;

                beforeEach(function () {
                    parameter1 = sinon.createStubInstance(Parameter);
                    parameter1.coerceArgument
                        .withArgs('hello')
                        .returns('world');
                    parameter1.getDefaultArgument.returns('first default');
                    parameter1.getName.returns('first_param');
                    parameter1.isRequired.returns(false);
                    parameter1.isVariadic.returns(false);
                    parameter2 = sinon.createStubInstance(Parameter);
                    parameter2.coerceArgument
                        .withArgs('foo')
                        .returns('bar');
                    parameter2.getDefaultArgument.returns('second default');
                    parameter2.getName.returns('second_param');
                    parameter2.isRequired.returns(false);
                    parameter2.isVariadic.returns(false);

                    signature.getParameterCount.returns(2);
                    signature.getParameters.returns([parameter1, parameter2]);
                });

                it('should invoke the wrapped handler with two arguments when neither coerces to a Future', function () {
                    callTypeHandler();

                    typedHandler('hello', 'foo');

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly('world', 'bar');
                });

                it('should invoke the wrapped handler with two arguments when second coerces to a Future', async function () {
                    parameter2.coerceArgument
                        .withArgs('foo')
                        .returns(futureFactory.createAsyncPresent('bar'));
                    callTypeHandler();

                    await typedHandler('hello', 'foo').toPromise();

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly('world', 'bar');
                });

                it('should invoke the wrapped handler with two arguments when both coerce to Futures', async function () {
                    parameter1.coerceArgument
                        .withArgs('hello')
                        .returns(futureFactory.createAsyncPresent('world'));
                    parameter2.coerceArgument
                        .withArgs('foo')
                        .returns(futureFactory.createAsyncPresent('bar'));
                    callTypeHandler();

                    await typedHandler('hello', 'foo').toPromise();

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly('world', 'bar');
                });

                it('should await the second coerced argument if it is a Future', async function () {
                    parameter2.coerceArgument
                        .withArgs('foo')
                        .returns(futureFactory.createAsyncPresent('bar'));
                    handler.returns('my original result');
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(await typedHandler('hello', 'foo').toPromise())
                        .to.equal('my coerced result');
                });

                it('should coerce the result via the Signature to apply its return type', function () {
                    handler.returns('my original result');
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(typedHandler('hello', 'foo')).to.equal('my coerced result');
                });

                it('should await the result before coercing if it is a Future', async function () {
                    handler.returns(futureFactory.createAsyncPresent('my original result'));
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(await typedHandler('hello', 'foo').toPromise()).to.equal('my coerced result');
                });

                it('should throw when a third argument is provided', function () {
                    callTypeHandler();

                    expect(function () {
                        typedHandler('first', 'second', 'third');
                    }).to.throw(
                        Exception,
                        'Too many opcode arguments provided - expected 2, got 3'
                    );
                });

                it('should throw when no arguments are passed but both parameters are required', function () {
                    parameter1.isRequired.returns(true);
                    parameter2.isRequired.returns(true);

                    callTypeHandler();

                    expect(function () {
                        typedHandler();
                    }).to.throw(
                        Exception,
                        'Missing argument for required parameter "first_param"'
                    );
                });

                it('should throw when one argument is passed but second parameter is required', function () {
                    parameter1.isRequired.returns(true);
                    parameter2.isRequired.returns(true);

                    callTypeHandler();

                    expect(function () {
                        typedHandler('first')();
                    }).to.throw(
                        Exception,
                        'Missing argument for required parameter "second_param"'
                    );
                });

                it('should use parameter defaults when neither argument is provided', async function () {
                    callTypeHandler();

                    typedHandler();

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly('first default', 'second default');
                });

                it('should use parameter default when only first argument is provided', async function () {
                    parameter1.coerceArgument
                        .withArgs('hello')
                        .returns(futureFactory.createAsyncPresent('world'));
                    callTypeHandler();

                    await typedHandler('hello').toPromise();

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly('world', 'second default');
                });
            });

            describe('with three formal parameters', function () {
                var parameter1,
                    parameter2,
                    parameter3;

                beforeEach(function () {
                    parameter1 = sinon.createStubInstance(Parameter);
                    parameter1.coerceArgument
                        .withArgs('hello')
                        .returns('world');
                    parameter1.getDefaultArgument.returns('first default');
                    parameter1.getName.returns('first_param');
                    parameter1.isRequired.returns(false);
                    parameter1.isVariadic.returns(false);
                    parameter1.test_name = 'parameter1';
                    parameter2 = sinon.createStubInstance(Parameter);
                    parameter2.coerceArgument
                        .withArgs('foo')
                        .returns('bar');
                    parameter2.getDefaultArgument.returns('second default');
                    parameter2.getName.returns('second_param');
                    parameter2.isRequired.returns(false);
                    parameter2.isVariadic.returns(false);
                    parameter2.test_name = 'parameter2';
                    parameter3 = sinon.createStubInstance(Parameter);
                    parameter3.coerceArgument
                        .withArgs('yours')
                        .returns('mine');
                    parameter3.getDefaultArgument.returns('third default');
                    parameter3.getName.returns('third_param');
                    parameter3.isRequired.returns(false);
                    parameter3.isVariadic.returns(false);
                    parameter3.test_name = 'parameter3';

                    signature.getParameterCount.returns(3);
                    signature.getParameters.returns([parameter1, parameter2, parameter3]);
                });

                it('should invoke the wrapped handler with three arguments when all are Futures', async function () {
                    parameter1.coerceArgument
                        .withArgs('hello')
                        .returns(futureFactory.createAsyncPresent('world'));
                    parameter2.coerceArgument
                        .withArgs('foo')
                        .returns(futureFactory.createAsyncPresent('bar'));
                    parameter2.coerceArgument
                        .withArgs('yours')
                        .returns(futureFactory.createAsyncPresent('mine'));
                    callTypeHandler();

                    await typedHandler('hello', 'foo', 'yours').toPromise();

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly('world', 'bar', 'mine');
                });
            });

            describe('with one formal and one variadic parameter', function () {
                var parameter1,
                    parameter2;

                beforeEach(function () {
                    parameter1 = sinon.createStubInstance(Parameter);
                    parameter1.coerceArgument
                        .withArgs('hello')
                        .returns('world');
                    parameter1.getDefaultArgument.returns('first default');
                    parameter1.getName.returns('first_param');
                    parameter1.isRequired.returns(false);
                    parameter1.isVariadic.returns(false);
                    parameter2 = sinon.createStubInstance(Parameter);
                    parameter2.coerceArgument
                        .withArgs('foo')
                        .returns('bar');
                    parameter2.coerceArgument
                        .withArgs('here')
                        .returns('there');
                    parameter2.coerceArgument
                        .returnsArg(0);
                    parameter2.getDefaultArgument.returns('second default');
                    parameter2.getName.returns('second_param');
                    parameter2.isRequired.returns(false);
                    parameter2.isVariadic.returns(true);

                    signature.getParameterCount.returns(2);
                    signature.getParameters.returns([parameter1, parameter2]);
                    signature.getVariadicParameter.returns(parameter2);
                    signature.hasVariadicParameter.returns(true);
                });

                it('should invoke the wrapped handler with two arguments when two given', async function () {
                    callTypeHandler();

                    typedHandler('hello', 'foo');

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly('world', ['bar']);
                });

                it('should invoke the wrapped handler with three arguments when three given', function () {
                    callTypeHandler();

                    typedHandler('hello', 'foo', 'here');

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
                        await typedHandler('hello', futureFactory.createAsyncPresent('foo'), 'here')
                            .toPromise()
                    )
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
            });

            describe('with only a variadic parameter', function () {
                var parameter;

                beforeEach(function () {
                    parameter = sinon.createStubInstance(Parameter);
                    parameter.coerceArgument
                        .withArgs('hello')
                        .returns('world');
                    parameter.coerceArgument
                        .withArgs('foo')
                        .returns('bar');
                    parameter.coerceArgument
                        .withArgs('here')
                        .returns('there');
                    parameter.coerceArgument
                        .returnsArg(0);
                    parameter.getName.returns('my_param');
                    parameter.isRequired.returns(false);
                    parameter.isVariadic.returns(true);

                    signature.getParameterCount.returns(1);
                    signature.getParameters.returns([parameter]);
                    signature.getVariadicParameter.returns(parameter);
                    signature.hasVariadicParameter.returns(true);
                });

                it('should invoke the wrapped handler with no arguments when none given', function () {
                    callTypeHandler();

                    typedHandler();

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly([]);
                });

                it('should invoke the wrapped handler with one argument when one given', function () {
                    callTypeHandler();

                    typedHandler('hello');

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly(['world']);
                });

                it('should invoke the wrapped handler with three arguments when three given', function () {
                    callTypeHandler();

                    typedHandler('hello', 'foo', 'here');

                    expect(handler).to.have.been.calledOnce;
                    expect(handler).to.have.been.calledOn(null);
                    expect(handler).to.have.been.calledWithExactly(['world', 'bar', 'there']);
                });

                it('should await the coerced argument if it is a Future', async function () {
                    handler.returns('my original result');
                    signature.coerceReturnValue
                        .withArgs('my original result')
                        .returns('my coerced result');
                    callTypeHandler();

                    expect(
                        await typedHandler('hello', futureFactory.createAsyncPresent('foo'), 'here')
                            .toPromise()
                    )
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
            });
        });
    });
});
