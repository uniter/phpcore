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
    Reference = require('../../../../../src/Reference/Reference'),
    ReferenceType = require('../../../../../src/Core/Opcode/Type/ReferenceType'),
    Value = require('../../../../../src/Value').sync(),
    Variable = require('../../../../../src/Variable').sync();

describe('Opcode ReferenceType', function () {
    var type;

    beforeEach(function () {
        type = new ReferenceType();
    });

    describe('allowsValue()', function () {
        it('should return true for a Reference instance', function () {
            var value = sinon.createStubInstance(Reference);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for a Variable instance', function () {
            var value = sinon.createStubInstance(Variable);

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
        it('should return the reference when given a Reference', function () {
            var reference = sinon.createStubInstance(Reference);

            expect(type.coerceValue(reference)).to.equal(reference);
        });

        it('should return the variable when given a Variable', function () {
            var variable = sinon.createStubInstance(Variable);

            expect(type.coerceValue(variable)).to.equal(variable);
        });

        it('should throw when given a Value', function () {
            var value = sinon.createStubInstance(Value);

            expect(function () {
                type.coerceValue(value);
            }).to.throw(
                Exception,
                'Unexpected value provided for ReferenceType'
            );
        });

        it('should throw when given a native string', function () {
            expect(function () {
                type.coerceValue('my string');
            }).to.throw(
                Exception,
                'Unexpected value provided for ReferenceType'
            );
        });
    });

    describe('getDisplayName()', function () {
        it('should return "ref"', function () {
            expect(type.getDisplayName()).to.equal('ref');
        });
    });
});
