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
    tools = require('../tools'),
    CallableType = require('../../../src/Type/CallableType'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    Translator = phpCommon.Translator,
    Value = require('../../../src/Value').sync();

describe('CallableType', function () {
    var futureFactory,
        globalNamespace,
        namespaceScope,
        state,
        type,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        globalNamespace = state.getGlobalNamespace();
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        valueFactory = state.getValueFactory();

        namespaceScope.getGlobalNamespace.returns(globalNamespace);

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
        it('should return true for a callable', async function () {
            var callableValue = sinon.createStubInstance(Value);
            callableValue.isCallable
                .withArgs(sinon.match.same(globalNamespace))
                .returns(futureFactory.createPresent(true));

            expect(await type.allowsValue(callableValue).toPromise()).to.be.true;
        });

        it('should return false for a non-callable', async function () {
            var callableValue = sinon.createStubInstance(Value);
            callableValue.isCallable
                .withArgs(sinon.match.same(globalNamespace))
                .returns(futureFactory.createPresent(false));

            expect(await type.allowsValue(callableValue).toPromise()).to.be.false;
        });

        it('should return true when null given and null is allowed', async function () {
            type = new CallableType(namespaceScope, true);

            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.true;
        });

        it('should return false when null given but null is disallowed', async function () {
            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.false;
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
