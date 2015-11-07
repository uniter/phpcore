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
    pausable = require('pausable'),
    sinon = require('sinon'),
    ObjectValue = require('../../src/Value/Object').async(pausable),
    PHPObject = require('../../src/PHPObject'),
    Promise = require('bluebird'),
    ValueFactory = require('../../src/ValueFactory').async(pausable);

describe('PHPObject', function () {
    beforeEach(function () {
        this.object = sinon.createStubInstance(ObjectValue);
        this.pausableCallPromise = new Promise(function (resolve) {
            this.resolveCall = resolve;
        }.bind(this));
        this.pausable = {
            call: sinon.stub().returns(this.pausableCallPromise)
        };
        this.valueFactory = sinon.createStubInstance(ValueFactory);
    });

    describe('callMethod()', function () {
        describe('when Pausable is available', function () {
            beforeEach(function () {
                this.phpObject = new PHPObject(this.pausable, this.valueFactory, this.object);
            });

            it('should return a Promise', function () {
                expect(this.phpObject.callMethod('myMethod', 21, 23)).to.be.an.instanceOf(Promise);
            });

            it('should coerce the arguments via the ValueFactory', function () {
                this.valueFactory.coerce.withArgs('my arg').returns('my coerced arg');
                this.valueFactory.coerce.withArgs(21).returns(22);

                this.phpObject.callMethod('myMethod', 'my arg', 21);

                expect(this.pausable.call).to.have.been.calledWith(
                    sinon.match.any,
                    ['myMethod', ['my coerced arg', 22]]
                );
            });

            it('should resolve the Promise when the call returns via Pausable', function () {
                var promise = this.phpObject.callMethod('myMethod', 21, 23);

                this.resolveCall();

                return expect(promise).to.eventually.be.fulfilled;
            });

            it('should resolve with the result when the call returns via Pausable', function () {
                var promise = this.phpObject.callMethod('myMethod', 21, 23);

                this.resolveCall('my result');

                return expect(promise).to.eventually.equal('my result');
            });
        });

        describe('when Pausable is unavailable', function () {
            beforeEach(function () {
                this.phpObject = new PHPObject(null, this.valueFactory, this.object);
            });

            it('should return the result', function () {
                this.object.callMethod.returns('my synchronous result');

                expect(this.phpObject.callMethod('myMethod', 21, 23))
                    .to.equal('my synchronous result');
            });
        });
    });
});
