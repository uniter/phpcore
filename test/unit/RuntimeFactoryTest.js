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
    GlobalStackHooker = require('../../src/FFI/Stack/GlobalStackHooker'),
    RuntimeFactory = require('../../src/RuntimeFactory');

describe('RuntimeFactory', function () {
    var AsyncPHPState,
        AsyncRuntime,
        Engine,
        Environment,
        factory,
        globalStackHooker,
        pausable,
        phpCommon,
        PHPStateWrapper,
        RuntimeWrapper,
        SyncPHPState,
        SyncRuntime;

    beforeEach(function () {
        AsyncPHPState = sinon.stub();
        AsyncRuntime = sinon.stub();
        Engine = sinon.stub();
        Environment = sinon.stub();
        globalStackHooker = sinon.createStubInstance(GlobalStackHooker);
        pausable = {iAm: 'pausable'};
        phpCommon = {iAm: 'phpcommon'};
        PHPStateWrapper = sinon.stub();
        RuntimeWrapper = sinon.stub();
        SyncPHPState = sinon.stub();
        SyncRuntime = sinon.stub();

        PHPStateWrapper.async = sinon.stub()
            .withArgs(sinon.match.same(pausable))
            .returns(AsyncPHPState);
        PHPStateWrapper.sync = sinon.stub()
            .returns(SyncPHPState);

        RuntimeWrapper.async = sinon.stub()
            .withArgs(sinon.match.same(pausable))
            .returns(AsyncRuntime);
        RuntimeWrapper.sync = sinon.stub()
            .returns(SyncRuntime);

        factory = new RuntimeFactory(
            Environment,
            Engine,
            PHPStateWrapper,
            RuntimeWrapper,
            phpCommon,
            globalStackHooker
        );
    });

    describe('create()', function () {
        it('should correctly create a Runtime in asynchronous mode', function () {
            var runtime = factory.create('async', pausable);

            expect(runtime).to.be.an.instanceOf(AsyncRuntime);
            expect(AsyncRuntime).to.have.been.calledOnce;
            expect(AsyncRuntime).to.have.been.calledWith(
                sinon.match.same(Environment),
                sinon.match.same(Engine),
                sinon.match.same(AsyncPHPState),
                sinon.match.same(phpCommon),
                sinon.match.same(globalStackHooker),
                sinon.match.same(pausable),
                'async'
            );
        });

        it('should correctly create a Runtime in Promise-synchronous mode', function () {
            var runtime = factory.create('psync');

            // Note that synchronous module instances should be used in psync mode
            expect(runtime).to.be.an.instanceOf(SyncRuntime);
            expect(SyncRuntime).to.have.been.calledOnce;
            expect(SyncRuntime).to.have.been.calledWith(
                sinon.match.same(Environment),
                sinon.match.same(Engine),
                sinon.match.same(SyncPHPState),
                sinon.match.same(phpCommon),
                sinon.match.same(globalStackHooker),
                null,
                'psync'
            );
        });

        it('should correctly create a Runtime in synchronous mode', function () {
            var runtime = factory.create('sync');

            expect(runtime).to.be.an.instanceOf(SyncRuntime);
            expect(SyncRuntime).to.have.been.calledOnce;
            expect(SyncRuntime).to.have.been.calledWith(
                sinon.match.same(Environment),
                sinon.match.same(Engine),
                sinon.match.same(SyncPHPState),
                sinon.match.same(phpCommon),
                sinon.match.same(globalStackHooker),
                null,
                'sync'
            );
        });
    });
});
