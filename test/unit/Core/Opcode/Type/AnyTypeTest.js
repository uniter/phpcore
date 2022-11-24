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
    AnyType = require('../../../../../src/Core/Opcode/Type/AnyType'),
    Value = require('../../../../../src/Value').sync();

describe('Opcode AnyType', function () {
    var type;

    beforeEach(function () {
        type = new AnyType();
    });

    describe('allowsValue()', function () {
        it('should return true for a native string', function () {
            expect(type.allowsValue('my string')).to.be.true;
        });

        it('should return true for a native number', function () {
            expect(type.allowsValue(1234)).to.be.true;
        });

        it('should return true for a Value instance', function () {
            var value = sinon.createStubInstance(Value);

            expect(type.allowsValue(value)).to.be.true;
        });
    });

    describe('coerceValue()', function () {
        it('should return a native string unchanged', function () {
            expect(type.coerceValue('my string')).to.equal('my string');
        });

        it('should return a native number unchanged', function () {
            expect(type.coerceValue(1234)).to.equal(1234);
        });

        it('should return a Value instance unchanged', function () {
            var value = sinon.createStubInstance(Value);

            expect(type.coerceValue(value)).to.equal(value);
        });
    });

    describe('getDisplayName()', function () {
        it('should return "any"', function () {
            expect(type.getDisplayName()).to.equal('any');
        });
    });
});
