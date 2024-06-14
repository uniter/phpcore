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
    Exception = phpCommon.Exception,
    FFIInternals = require('../../../../src/FFI/Internals/Internals'),
    OpcodeHandlerFactory = require('../../../../src/Core/Opcode/Handler/OpcodeHandlerFactory'),
    OpcodeHandlerTyper = require('../../../../src/Core/Internals/OpcodeHandlerTyper'),
    OpcodeInternalsClassFactory = require('../../../../src/Core/Internals/OpcodeInternalsClassFactory');

describe('OpcodeInternalsClassFactory', function () {
    var baseInternals,
        classFactory,
        opcodeHandlerFactory,
        opcodeHandlerTyper;

    beforeEach(function () {
        baseInternals = sinon.createStubInstance(FFIInternals);
        opcodeHandlerFactory = sinon.createStubInstance(OpcodeHandlerFactory);
        opcodeHandlerTyper = sinon.createStubInstance(OpcodeHandlerTyper);

        classFactory = new OpcodeInternalsClassFactory(
            baseInternals,
            opcodeHandlerFactory,
            opcodeHandlerTyper
        );
    });

    describe('create()', function () {
        describe('the OpcodeInternals class returned', function () {
            var callCreate,
                internals,
                Internals;

            beforeEach(function () {
                callCreate = function () {
                    Internals = classFactory.create();

                    internals = new Internals();
                };
            });

            describe('typeHandler()', function () {
                var handler;

                beforeEach(function () {
                    handler = sinon.stub();
                });

                it('should type the handler via the OpcodeHandlerTyper', function () {
                    var typedHandler = sinon.stub();
                    callCreate();
                    internals.setOpcodeFetcher('my_fetcher_type');
                    opcodeHandlerTyper.typeHandler
                        .withArgs('my_type myParam', sinon.match.same(handler))
                        .returns(typedHandler);

                    expect(internals.typeHandler('my_type myParam', handler)).to.equal(typedHandler);
                });

                it('should throw when the opcode handler was marked as untraced', function () {
                    callCreate();

                    internals.disableTracing();

                    expect(function () {
                        internals.typeHandler('my_type myParam', handler);
                    }).to.throw(
                        Exception,
                        'Cannot type an untraced opcode handler'
                    );
                });

                it('should throw when no opcode fetcher has been set', function () {
                    callCreate();

                    expect(function () {
                        internals.typeHandler('my_type myParam', handler);
                    }).to.throw(
                        Exception,
                        'Opcode fetcher has not been set'
                    );
                });
            });
        });
    });
});
