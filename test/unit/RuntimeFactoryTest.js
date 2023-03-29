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
    RuntimeFactory = require('../../src/RuntimeFactory'),
    StateFactory = require('../../src/Runtime/StateFactory');

describe('RuntimeFactory', function () {
    var Engine,
        factory,
        phpCommon,
        Runtime,
        stateFactory;

    beforeEach(function () {
        Engine = sinon.stub();
        phpCommon = {iAm: 'phpcommon'};
        Runtime = sinon.stub();
        stateFactory = sinon.createStubInstance(StateFactory);

        factory = new RuntimeFactory(
            Engine,
            Runtime,
            phpCommon,
            stateFactory
        );
    });

    describe('create()', function () {
        it('should correctly create a Runtime', function () {
            var runtime = factory.create('async');

            expect(runtime).to.be.an.instanceOf(Runtime);
            expect(Runtime).to.have.been.calledOnce;
            expect(Runtime).to.have.been.calledWith(
                sinon.match.same(Engine),
                sinon.match.same(phpCommon),
                sinon.match.same(stateFactory),
                'async'
            );
        });

        it('should correctly create a Runtime in Promise-synchronous mode', function () {
            var runtime = factory.create('psync');

            expect(runtime).to.be.an.instanceOf(Runtime);
            expect(Runtime).to.have.been.calledOnce;
            expect(Runtime).to.have.been.calledWith(
                sinon.match.same(Engine),
                sinon.match.same(phpCommon),
                sinon.match.same(stateFactory),
                'psync'
            );
        });

        it('should correctly create a Runtime in synchronous mode', function () {
            var runtime = factory.create('sync');

            expect(runtime).to.be.an.instanceOf(Runtime);
            expect(Runtime).to.have.been.calledOnce;
            expect(Runtime).to.have.been.calledWith(
                sinon.match.same(Engine),
                sinon.match.same(phpCommon),
                sinon.match.same(stateFactory),
                'sync'
            );
        });
    });
});
