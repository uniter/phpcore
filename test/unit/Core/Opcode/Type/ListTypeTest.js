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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    Exception = phpCommon.Exception,
    List = require('../../../../../src/List'),
    ListType = require('../../../../../src/Core/Opcode/Type/ListType'),
    Value = require('../../../../../src/Value').sync();

describe('Opcode ListType', function () {
    var type;

    beforeEach(function () {
        type = new ListType();
    });

    describe('allowsValue()', function () {
        it('should return true for a List instance', function () {
            var value = sinon.createStubInstance(List);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return false for a native string', function () {
            expect(type.allowsValue('my string')).to.be.false;
        });

        it('should return false for a Value instance', function () {
            var value = sinon.createStubInstance(Value);

            expect(type.allowsValue(value)).to.be.false;
        });
    });

    describe('coerceValue()', function () {
        it('should return the list when given a List', function () {
            var list = sinon.createStubInstance(List);

            expect(type.coerceValue(list)).to.equal(list);
        });

        it('should throw when given a Value', function () {
            var value = sinon.createStubInstance(Value);

            expect(function () {
                type.coerceValue(value);
            }).to.throw(
                Exception,
                'Unexpected value provided for ListType'
            );
        });

        it('should throw when given a native string', function () {
            expect(function () {
                type.coerceValue('my string');
            }).to.throw(
                Exception,
                'Unexpected value provided for ListType'
            );
        });
    });

    describe('getDisplayName()', function () {
        it('should return "list"', function () {
            expect(type.getDisplayName()).to.equal('list');
        });
    });
});
