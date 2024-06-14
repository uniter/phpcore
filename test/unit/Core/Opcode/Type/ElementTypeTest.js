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
    ElementType = require('../../../../../src/Core/Opcode/Type/ElementType'),
    KeyReferencePair = require('../../../../../src/KeyReferencePair'),
    KeyValuePair = require('../../../../../src/KeyValuePair'),
    Reference = require('../../../../../src/Reference/Reference'),
    ReferenceElement = require('../../../../../src/Element/ReferenceElement'),
    Value = require('../../../../../src/Value').sync(),
    ValueFactory = require('../../../../../src/ValueFactory').sync(),
    Variable = require('../../../../../src/Variable').sync();

describe('Opcode ElementType', function () {
    var type,
        valueFactory;

    beforeEach(function () {
        valueFactory = sinon.createStubInstance(ValueFactory);
        valueFactory.isValue
            .withArgs(sinon.match.instanceOf(Value))
            .returns(true);
        valueFactory.isValue.returns(false);

        type = new ElementType(valueFactory);
    });

    describe('allowsValue()', function () {
        it('should return true for a Value instance', function () {
            var value = sinon.createStubInstance(Value);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for a ReferenceElement instance', function () {
            var value = sinon.createStubInstance(ReferenceElement);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for a KeyReferencePair instance', function () {
            var value = sinon.createStubInstance(KeyReferencePair);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for a KeyValuePair instance', function () {
            var value = sinon.createStubInstance(KeyValuePair);

            expect(type.allowsValue(value)).to.be.true;
        });

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
    });

    describe('coerceValue()', function () {
        it('should return the value when given a Value instance', function () {
            var value = sinon.createStubInstance(Value);

            expect(type.coerceValue(value)).to.equal(value);
        });

        it('should return the element when given a ReferenceElement instance', function () {
            var value = sinon.createStubInstance(ReferenceElement);

            expect(type.coerceValue(value)).to.equal(value);
        });

        it('should return the pair when given a KeyReferencePair instance', function () {
            var value = sinon.createStubInstance(KeyReferencePair);

            expect(type.coerceValue(value)).to.equal(value);
        });

        it('should return the pair when given a KeyValuePair instance', function () {
            var value = sinon.createStubInstance(KeyValuePair);

            expect(type.coerceValue(value)).to.equal(value);
        });

        it('should return the reference when given a Reference instance', function () {
            var value = sinon.createStubInstance(Reference);

            expect(type.coerceValue(value)).to.equal(value);
        });

        it('should return the variable when given a Variable instance', function () {
            var value = sinon.createStubInstance(Variable);

            expect(type.coerceValue(value)).to.equal(value);
        });

        it('should throw when given a native string', function () {
            expect(function () {
                type.coerceValue('my string');
            }).to.throw(
                Exception,
                'Unexpected value provided for ElementType'
            );
        });
    });

    describe('getDisplayName()', function () {
        it('should return "element"', function () {
            expect(type.getDisplayName()).to.equal('element');
        });
    });
});
