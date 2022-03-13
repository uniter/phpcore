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
    var Engine,
        Environment,
        factory,
        globalStackHooker,
        phpCommon,
        PHPState,
        Runtime;

    beforeEach(function () {
        Engine = sinon.stub();
        Environment = sinon.stub();
        globalStackHooker = sinon.createStubInstance(GlobalStackHooker);
        phpCommon = {iAm: 'phpcommon'};
        PHPState = sinon.stub();
        Runtime = sinon.stub();

        factory = new RuntimeFactory(
            Environment,
            Engine,
            PHPState,
            Runtime,
            phpCommon,
            globalStackHooker
        );
    });

    describe('create()', function () {
        it('should correctly create a Runtime', function () {
            var runtime = factory.create('async');

            expect(runtime).to.be.an.instanceOf(Runtime);
            expect(Runtime).to.have.been.calledOnce;
            expect(Runtime).to.have.been.calledWith(
                sinon.match.same(Environment),
                sinon.match.same(Engine),
                sinon.match.same(PHPState),
                sinon.match.same(phpCommon),
                sinon.match.same(globalStackHooker),
                'async'
            );
        });

        it('should correctly create a Runtime in Promise-synchronous mode', function () {
            var runtime = factory.create('psync');

            expect(runtime).to.be.an.instanceOf(Runtime);
            expect(Runtime).to.have.been.calledOnce;
            expect(Runtime).to.have.been.calledWith(
                sinon.match.same(Environment),
                sinon.match.same(Engine),
                sinon.match.same(PHPState),
                sinon.match.same(phpCommon),
                sinon.match.same(globalStackHooker),
                'psync'
            );
        });

        it('should correctly create a Runtime in synchronous mode', function () {
            var runtime = factory.create('sync');

            expect(runtime).to.be.an.instanceOf(Runtime);
            expect(Runtime).to.have.been.calledOnce;
            expect(Runtime).to.have.been.calledWith(
                sinon.match.same(Environment),
                sinon.match.same(Engine),
                sinon.match.same(PHPState),
                sinon.match.same(phpCommon),
                sinon.match.same(globalStackHooker),
                'sync'
            );
        });
    });
});
