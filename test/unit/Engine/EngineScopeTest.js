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
    ControlScope = require('../../../src/Control/ControlScope'),
    Coroutine = require('../../../src/Control/Coroutine'),
    EngineScope = require('../../../src/Engine/EngineScope'),
    Scope = require('../../../src/Scope').sync();

describe('EngineScope', function () {
    var controlScope,
        coroutine,
        effectiveScope,
        scope;

    beforeEach(function () {
        controlScope = sinon.createStubInstance(ControlScope);
        coroutine = sinon.createStubInstance(Coroutine);
        effectiveScope = sinon.createStubInstance(Scope);

        scope = new EngineScope(effectiveScope, controlScope, coroutine);
    });

    describe('enterCoroutine()', function () {
        it('should resume the current Coroutine for the Scope when it has one', function () {
            scope.enterCoroutine();

            expect(controlScope.resumeCoroutine).to.have.been.calledOnce;
            expect(controlScope.resumeCoroutine).to.have.been.calledWith(
                sinon.match.same(coroutine)
            );
        });

        describe('when the Scope has no current Coroutine', function () {
            var newCoroutine;

            beforeEach(function () {
                newCoroutine = sinon.createStubInstance(Coroutine);

                controlScope.enterCoroutine.returns(newCoroutine);

                scope = new EngineScope(effectiveScope, controlScope, null);
            });

            it('should enter a new current Coroutine for the Scope', function () {
                scope.enterCoroutine();

                expect(controlScope.enterCoroutine).to.have.been.calledOnce;
            });

            it('should update the Scope with the new Coroutine', function () {
                scope.enterCoroutine();

                expect(scope.getCoroutine()).to.equal(newCoroutine);
            });
        });
    });

    describe('getCoroutine()', function () {
        it('should return the current Coroutine for the Scope', function () {
            expect(scope.getCoroutine()).to.equal(coroutine);
        });
    });

    describe('updateCoroutine()', function () {
        it('should update the current Coroutine for the Scope', function () {
            var newCoroutine = sinon.createStubInstance(Coroutine);

            scope.updateCoroutine(newCoroutine);

            expect(scope.getCoroutine()).to.equal(newCoroutine);
        });
    });
});
