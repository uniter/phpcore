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
    NativeCaller = require('../../../../src/FFI/Call/NativeCaller').sync(),
    ObjectValue = require('../../../../src/Value/Object').sync(),
    PHPObject = require('../../../../src/FFI/Value/PHPObject').sync(),
    ValueFactory = require('../../../../src/ValueFactory').sync();

describe('PHPObject', function () {
    var nativeCaller,
        objectValue,
        phpObject,
        valueFactory;

    beforeEach(function () {
        nativeCaller = sinon.createStubInstance(NativeCaller);
        objectValue = sinon.createStubInstance(ObjectValue);
        valueFactory = new ValueFactory();

        phpObject = new PHPObject(valueFactory, nativeCaller, objectValue);
    });

    describe('callMethod()', function () {
        it('should return the result from calling via the NativeCaller', function () {
            var result;
            nativeCaller.callMethod.returns(21);

            result = phpObject.callMethod('myMethod', 21, 'hello');

            expect(result).to.equal(21);
            expect(nativeCaller.callMethod).to.have.been.calledOnce;
            expect(nativeCaller.callMethod).to.have.been.calledWith(
                sinon.match.same(objectValue),
                'myMethod'
            );
            expect(nativeCaller.callMethod.args[0][2]).to.have.length(2);
            expect(nativeCaller.callMethod.args[0][2][0].getType()).to.equal('int');
            expect(nativeCaller.callMethod.args[0][2][0].getNative()).to.equal(21);
            expect(nativeCaller.callMethod.args[0][2][1].getType()).to.equal('string');
            expect(nativeCaller.callMethod.args[0][2][1].getNative()).to.equal('hello');
        });
    });

    describe('getObjectValue()', function () {
        it('should return the unwrapped ObjectValue', function () {
            expect(phpObject.getObjectValue()).to.equal(objectValue);
        });
    });
});
