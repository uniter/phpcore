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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    CallFactory = require('../../src/CallFactory'),
    CallStack = require('../../src/CallStack'),
    ElementProvider = require('../../src/Reference/Element/ElementProvider'),
    ErrorPromoter = require('../../src/Error/ErrorPromoter'),
    Namespace = require('../../src/Namespace').async(pausable),
    Promise = require('lie'),
    Translator = phpCommon.Translator,
    ValueFactory = require('../../src/ValueFactory').async(pausable),
    ValueStorage = require('../../src/FFI/Value/ValueStorage');

describe('ValueFactory (async mode)', function () {
    var callFactory,
        callStack,
        elementProvider,
        errorPromoter,
        factory,
        globalNamespace,
        translator,
        valueStorage;

    beforeEach(function () {
        callFactory = sinon.createStubInstance(CallFactory);
        callStack = sinon.createStubInstance(CallStack);
        elementProvider = new ElementProvider();
        errorPromoter = sinon.createStubInstance(ErrorPromoter);
        globalNamespace = sinon.createStubInstance(Namespace);
        translator = sinon.createStubInstance(Translator);
        valueStorage = new ValueStorage();

        translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });

        factory = new ValueFactory(
            pausable,
            'async',
            elementProvider,
            translator,
            callFactory,
            errorPromoter,
            valueStorage
        );
        factory.setCallStack(callStack);
        factory.setGlobalNamespace(globalNamespace);
    });

    describe('coerce()', function () {
        it('should await a promise synchronously in async mode', function (done) {
            var func = pausable.executeSync([done, expect, factory], function (done, expect, factory) {
                return function () {
                    var promise = new Promise(function (resolve) {
                            setTimeout(function () {
                                resolve(21);
                            }, 1);
                        }),
                        resultValue;

                    resultValue = factory.coerce(promise);

                    expect(resultValue.getType()).to.equal('int');
                    expect(resultValue.getNative()).to.equal(21);
                    done();
                };
            });

            pausable.call(func);
        });
    });

    describe('coercePromise()', function () {
        it('should await a promise synchronously in async mode', function (done) {
            var func = pausable.executeSync([done, expect, factory], function (done, expect, factory) {
                return function () {
                    var promise = new Promise(function (resolve) {
                            setTimeout(function () {
                                resolve(21);
                            }, 1);
                        }),
                        resultValue;

                    resultValue = factory.coercePromise(promise);

                    expect(resultValue.getType()).to.equal('int');
                    expect(resultValue.getNative()).to.equal(21);
                    done();
                };
            });

            pausable.call(func);
        });
    });
});
