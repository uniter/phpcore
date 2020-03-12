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
    CallFactory = require('../../src/CallFactory'),
    CallStack = require('../../src/CallStack'),
    ErrorPromoter = require('../../src/Error/ErrorPromoter'),
    ObjectValue = require('../../src/Value/Object').async(pausable),
    PHPObject = require('../../src/PHPObject').async(pausable),
    Promise = require('lie'),
    StringValue = require('../../src/Value/String').async(pausable),
    ValueFactory = require('../../src/ValueFactory').async(pausable);

describe('PHPObject', function () {
    var callFactory,
        callStack,
        createPHPObject,
        errorPromoter,
        object,
        pausableCallPromise,
        phpObject,
        resolveCall,
        valueFactory;

    beforeEach(function () {
        callFactory = sinon.createStubInstance(CallFactory);
        callStack = sinon.createStubInstance(CallStack);
        errorPromoter = sinon.createStubInstance(ErrorPromoter);
        object = sinon.createStubInstance(ObjectValue);
        pausableCallPromise = new Promise(function (resolve) {
            resolveCall = resolve;
        });
        pausable = {
            call: sinon.stub().returns(pausableCallPromise)
        };
        valueFactory = sinon.createStubInstance(ValueFactory);

        valueFactory.createString.callsFake(function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getNative.returns(nativeValue);
            return stringValue;
        });

        createPHPObject = function (pausable, mode) {
            return new PHPObject(
                callFactory,
                callStack,
                errorPromoter,
                pausable || null,
                mode || 'async',
                valueFactory,
                object
            );
        };
    });

    describe('callMethod()', function () {
        describe('in asynchronous mode (when Pausable is available)', function () {
            beforeEach(function () {
                phpObject = createPHPObject(pausable, 'async');
            });

            it('should return a Promise', function () {
                expect(phpObject.callMethod('myMethod', 21, 23)).to.be.an.instanceOf(Promise);
            });

            it('should coerce the arguments via the ValueFactory', function () {
                valueFactory.coerce.withArgs('my arg').returns('my coerced arg');
                valueFactory.coerce.withArgs(21).returns(22);

                phpObject.callMethod('myMethod', 'my arg', 21);

                expect(pausable.call).to.have.been.calledWith(
                    sinon.match.any,
                    ['myMethod', ['my coerced arg', 22]]
                );
            });

            it('should resolve the Promise when the call returns via Pausable', function () {
                var promise = phpObject.callMethod('myMethod', 21, 23);

                resolveCall(valueFactory.createString('my result'));

                return expect(promise).to.eventually.be.fulfilled;
            });

            it('should resolve with the result when the call returns via Pausable', function () {
                var promise = phpObject.callMethod('myMethod', 21, 23);

                resolveCall(valueFactory.createString('my result'));

                return expect(promise).to.eventually.equal('my result');
            });
        });

        describe('in synchronous mode (when Pausable is unavailable)', function () {
            beforeEach(function () {
                phpObject = createPHPObject(null, 'sync');
            });

            it('should return the unwrapped native result', function () {
                object.callMethod.returns(valueFactory.createString('my synchronous result'));

                expect(phpObject.callMethod('myMethod', 21, 23))
                    .to.equal('my synchronous result');
            });

            it('should not catch a non-PHP error', function () {
                object.callMethod.throws(new TypeError('A type error occurred'));

                expect(function () {
                    phpObject.callMethod('myMethod');
                }).to.throw(TypeError, 'A type error occurred');
            });

            it('should promote a PHP error to a native JS one and rethrow it as that', function () {
                var errorValue = sinon.createStubInstance(ObjectValue);
                errorPromoter.promote
                    .withArgs(sinon.match.same(errorValue))
                    .returns(new Error('My error, coerced from a PHP exception'));
                object.callMethod.throws(errorValue);

                expect(function () {
                    phpObject.callMethod('myMethod');
                }).to.throw(Error, 'My error, coerced from a PHP exception');
            });
        });

        describe('in Promise-synchronous mode (when Pausable is unavailable)', function () {
            beforeEach(function () {
                phpObject = createPHPObject(null, 'psync');
            });

            it('should return a Promise', function () {
                expect(phpObject.callMethod('myMethod', 21, 23)).to.be.an.instanceOf(Promise);
            });

            it('should coerce the arguments via the ValueFactory', function () {
                valueFactory.coerce.withArgs('my arg').returns('my coerced arg');
                valueFactory.coerce.withArgs(21).returns(22);

                phpObject.callMethod('myMethod', 'my arg', 21);

                expect(object.callMethod).to.have.been.calledWith(
                    'myMethod',
                    ['my coerced arg', 22]
                );
            });

            it('should return a Promise resolved with the synchronous result', function () {
                var promise;
                object.callMethod.returns(valueFactory.createString('my synchronous result'));

                promise = phpObject.callMethod('myMethod', 21, 23);

                return expect(promise).to.eventually.equal('my synchronous result');
            });
        });
    });

    describe('getObjectValue()', function () {
        it('should return the unwrapped ObjectValue', function () {
            var phpObject = createPHPObject(null, 'sync');

            expect(phpObject.getObjectValue()).to.equal(object);
        });
    });
});
