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
    DebugFactory = require('../../../src/Debug/DebugFactory');

describe('DebugFactory', function () {
    beforeEach(function () {
        this.DebugFormatter = sinon.stub();
        this.DebugValue = sinon.stub();
        this.ValueFormatter = sinon.stub();

        this.debugFactory = new DebugFactory(this.DebugFormatter, this.DebugValue, this.ValueFormatter);
    });

    describe('createDebugFormatter()', function () {
        it('should pass the DebugFactory to the created ValueFormatter', function () {
            this.debugFactory.createDebugFormatter();

            expect(this.ValueFormatter).to.have.been.calledOnce;
            expect(this.ValueFormatter).to.have.been.calledWith(sinon.match.same(this.debugFactory));
        });

        it('should pass the created ValueFormatter to the DebugFormatter', function () {
            var valueFormatter = sinon.createStubInstance(this.ValueFormatter);
            this.ValueFormatter.returns(valueFormatter);

            this.debugFactory.createDebugFormatter();

            expect(this.DebugFormatter).to.have.been.calledOnce;
            expect(this.DebugFormatter).to.have.been.calledWith(sinon.match.same(valueFormatter));
        });

        it('should return the created DebugFormatter', function () {
            var debugFormatter = sinon.createStubInstance(this.DebugFormatter);
            this.DebugFormatter.returns(debugFormatter);

            expect(this.debugFactory.createDebugFormatter()).to.equal(debugFormatter);
        });
    });
});
