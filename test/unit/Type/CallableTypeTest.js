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
    CallableType = require('../../../src/Type/CallableType'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    Translator = phpCommon.Translator,
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('CallableType', function () {
    var namespaceScope,
        type,
        valueFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        valueFactory = new ValueFactory();

        type = new CallableType(namespaceScope, false);
    });

    describe('allowsNull()', function () {
        it('should return true when set', function () {
            type = new CallableType(namespaceScope, true);

            expect(type.allowsNull()).to.be.true;
        });

        it('should return false when set', function () {
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('allowsValue()', function () {
        it('should return true for a callable', function () {
            var callableValue = sinon.createStubInstance(Value);
            callableValue.isCallable.returns(true);

            expect(type.allowsValue(callableValue)).to.be.true;
        });

        it('should return false for a non-callable', function () {
            var callableValue = sinon.createStubInstance(Value);
            callableValue.isCallable.returns(false);

            expect(type.allowsValue(callableValue)).to.be.false;
        });

        it('should return true when null given and null is allowed', function () {
            type = new CallableType(namespaceScope, true);

            expect(type.allowsValue(valueFactory.createNull())).to.be.true;
        });

        it('should return false when null given but null is disallowed', function () {
            expect(type.allowsValue(valueFactory.createNull())).to.be.false;
        });
    });

    describe('getDisplayName()', function () {
        it('should return "callable"', function () {
            expect(type.getDisplayName()).to.equal('callable');
        });
    });

    describe('getExpectedMessage()', function () {
        it('should return the correct message', function () {
            var translator = sinon.createStubInstance(Translator);
            translator.translate
                .callsFake(function (translationKey, placeholderVariables) {
                    return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
                });

            expect(type.getExpectedMessage(translator)).to.equal('callable');
        });
    });

    describe('isScalar()', function () {
        it('should return false', function () {
            expect(type.isScalar()).to.be.false;
        });
    });
});
