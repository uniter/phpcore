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
    KeyReferencePair = require('../../../../../src/KeyReferencePair'),
    KeyValuePair = require('../../../../../src/KeyValuePair'),
    Reference = require('../../../../../src/Reference/Reference'),
    ReferenceElement = require('../../../../../src/Element/ReferenceElement'),
    Value = require('../../../../../src/Value').sync(),
    Variable = require('../../../../../src/Variable').sync(),
    VoidType = require('../../../../../src/Core/Opcode/Type/VoidType');

describe('Opcode VoidType', function () {
    var type;

    beforeEach(function () {
        type = new VoidType();
    });

    describe('allowsValue()', function () {
        it('should return true for native undefined', function () {
            expect(type.allowsValue(undefined)).to.be.true;
        });

        it('should return false for a Value instance', function () {
            var value = sinon.createStubInstance(Value);

            expect(type.allowsValue(value)).to.be.false;
        });

        it('should return false for a ReferenceElement instance', function () {
            var value = sinon.createStubInstance(ReferenceElement);

            expect(type.allowsValue(value)).to.be.false;
        });

        it('should return false for a KeyReferencePair instance', function () {
            var value = sinon.createStubInstance(KeyReferencePair);

            expect(type.allowsValue(value)).to.be.false;
        });

        it('should return false for a KeyValuePair instance', function () {
            var value = sinon.createStubInstance(KeyValuePair);

            expect(type.allowsValue(value)).to.be.false;
        });

        it('should return false for a Reference instance', function () {
            var value = sinon.createStubInstance(Reference);

            expect(type.allowsValue(value)).to.be.false;
        });

        it('should return false for a Variable instance', function () {
            var value = sinon.createStubInstance(Variable);

            expect(type.allowsValue(value)).to.be.false;
        });

        it('should return false for a native string', function () {
            expect(type.allowsValue('my string')).to.be.false;
        });
    });

    describe('coerceValue()', function () {
        it('should return the value when given native undefined', function () {
            expect(type.coerceValue(undefined)).to.be.undefined;
        });

        it('should throw when given a Value instance', function () {
            var value = sinon.createStubInstance(Value);

            expect(function () {
                type.coerceValue(value);
            }).to.throw(
                Exception,
                'Unexpected value of type "object" provided for VoidType'
            );
        });

        it('should throw when given a ReferenceElement instance', function () {
            var value = sinon.createStubInstance(ReferenceElement);

            expect(function () {
                type.coerceValue(value);
            }).to.throw(
                Exception,
                'Unexpected value of type "object" provided for VoidType'
            );
        });

        it('should throw when given a KeyReferencePair instance', function () {
            var value = sinon.createStubInstance(KeyReferencePair);

            expect(function () {
                type.coerceValue(value);
            }).to.throw(
                Exception,
                'Unexpected value of type "object" provided for VoidType'
            );
        });

        it('should throw when given a KeyValuePair instance', function () {
            var value = sinon.createStubInstance(KeyValuePair);

            expect(function () {
                type.coerceValue(value);
            }).to.throw(
                Exception,
                'Unexpected value of type "object" provided for VoidType'
            );
        });

        it('should throw when given a Reference instance', function () {
            var value = sinon.createStubInstance(Reference);

            expect(function () {
                type.coerceValue(value);
            }).to.throw(
                Exception,
                'Unexpected value of type "object" provided for VoidType'
            );
        });

        it('should throw when given a Variable instance', function () {
            var value = sinon.createStubInstance(Variable);

            expect(function () {
                type.coerceValue(value);
            }).to.throw(
                Exception,
                'Unexpected value of type "object" provided for VoidType'
            );
        });

        it('should throw when given a native string', function () {
            expect(function () {
                type.coerceValue('my string');
            }).to.throw(
                Exception,
                'Unexpected value of type "string" provided for VoidType'
            );
        });
    });

    describe('getDisplayName()', function () {
        it('should return "void"', function () {
            expect(type.getDisplayName()).to.equal('void');
        });
    });
});
