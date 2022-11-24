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
    tools = require('../../../tools'),
    Exception = phpCommon.Exception,
    Reference = require('../../../../../src/Reference/Reference'),
    Value = require('../../../../../src/Value').sync(),
    ValueType = require('../../../../../src/Core/Opcode/Type/ValueType'),
    Variable = require('../../../../../src/Variable').sync();

describe('Opcode ValueType', function () {
    var state,
        type,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        valueFactory = state.getValueFactory();

        type = new ValueType(valueFactory);
    });

    describe('allowsValue()', function () {
        it('should return true for a Reference instance', function () {
            var value = sinon.createStubInstance(Reference);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for a Value instance', function () {
            var value = sinon.createStubInstance(Value);

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
        it('should return the value when given a Value', function () {
            var value = valueFactory.createString('my string');

            expect(type.coerceValue(value)).to.equal(value);
        });

        it('should throw when given a native string', function () {
            expect(function () {
                type.coerceValue('my string');
            }).to.throw(
                Exception,
                'Unexpected value provided for ValueType'
            );
        });

        describe('when given a Reference', function () {
            var reference;

            beforeEach(function () {
                reference = sinon.createStubInstance(Reference);

                reference.getValue.returns(valueFactory.createAsyncPresent('my value'));
            });

            it('should return its value', async function () {
                var value;

                value = await type.coerceValue(reference).toPromise();

                expect(value.getType()).to.equal('string');
                expect(value.getNative()).to.equal('my value');
            });
        });

        describe('when given a Variable', function () {
            var variable;

            beforeEach(function () {
                variable = sinon.createStubInstance(Variable);

                variable.getValue.returns(valueFactory.createAsyncPresent('my value'));
            });

            it('should return its value', async function () {
                var value;

                value = await type.coerceValue(variable).toPromise();

                expect(value.getType()).to.equal('string');
                expect(value.getNative()).to.equal('my value');
            });
        });
    });

    describe('getDisplayName()', function () {
        it('should return "val"', function () {
            expect(type.getDisplayName()).to.equal('val');
        });
    });
});
