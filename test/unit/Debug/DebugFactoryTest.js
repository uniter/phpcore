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
    var debugFactory,
        DebugFormatter,
        DebugValue,
        ValueFormatter;

    beforeEach(function () {
        DebugFormatter = sinon.stub();
        DebugValue = sinon.stub();
        ValueFormatter = sinon.stub();

        debugFactory = new DebugFactory(DebugFormatter, DebugValue, ValueFormatter);
    });

    describe('createDebugFormatter()', function () {
        it('should pass the DebugFactory to the created ValueFormatter', function () {
            debugFactory.createDebugFormatter();

            expect(ValueFormatter).to.have.been.calledOnce;
            expect(ValueFormatter).to.have.been.calledWith(sinon.match.same(debugFactory));
        });

        it('should pass the created ValueFormatter to the DebugFormatter', function () {
            var valueFormatter = sinon.createStubInstance(ValueFormatter);
            ValueFormatter.returns(valueFormatter);

            debugFactory.createDebugFormatter();

            expect(DebugFormatter).to.have.been.calledOnce;
            expect(DebugFormatter).to.have.been.calledWith(sinon.match.same(valueFormatter));
        });

        it('should return the created DebugFormatter', function () {
            var debugFormatter = sinon.createStubInstance(DebugFormatter);
            DebugFormatter.returns(debugFormatter);

            expect(debugFactory.createDebugFormatter()).to.equal(debugFormatter);
        });
    });
});
