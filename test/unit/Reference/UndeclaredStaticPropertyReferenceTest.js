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
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    PHPError = phpCommon.PHPError,
    UndeclaredStaticPropertyReference = require('../../../src/Reference/UndeclaredStaticProperty'),
    Value = require('../../../src/Value').sync();

describe('UndeclaredStaticPropertyReference', function () {
    var callStack,
        classObject,
        futureFactory,
        reference,
        state,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState(null, {
            'call_stack': callStack
        });
        classObject = sinon.createStubInstance(Class);
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        callStack.raiseTranslatedError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, translationKey, placeholderVariables) {
                throw new Error(
                    'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
                );
            });

        reference = new UndeclaredStaticPropertyReference(
            valueFactory,
            state.getReferenceFactory(),
            futureFactory,
            callStack,
            classObject,
            'myProperty'
        );
    });

    describe('asArrayElement()', function () {
        it('should raise an error', function () {
            expect(function () {
                reference.asArrayElement();
            }).to.throw(
                'Fake PHP Fatal error for #core.undeclared_static_property with {"propertyName":"myProperty"}'
            );
        });
    });

    describe('asEventualNative()', function () {
        it('should raise an error', function () {
            expect(function () {
                reference.asEventualNative();
            }).to.throw(
                'Fake PHP Fatal error for #core.undeclared_static_property with {"propertyName":"myProperty"}'
            );
        });
    });

    describe('formatAsString()', function () {
        it('should return "NULL"', function () {
            expect(reference.formatAsString()).to.equal('NULL');
        });
    });

    describe('getValue()', function () {
        it('should raise an error', function () {
            expect(function () {
                reference.getValue();
            }).to.throw(
                'Fake PHP Fatal error for #core.undeclared_static_property with {"propertyName":"myProperty"}'
            );
        });
    });

    describe('getValueOrNativeNull()', function () {
        it('should return native null', function () {
            expect(reference.getValueOrNativeNull()).to.be.null;
        });
    });

    describe('getValueOrNull()', function () {
        it('should return a NullValue', function () {
            expect(reference.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('hasReferenceSetter()', function () {
        it('should return false', function () {
            expect(reference.hasReferenceSetter()).to.be.false;
        });
    });

    describe('isDefined()', function () {
        it('should return false', function () {
            expect(reference.isDefined()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true', async function () {
            expect(await reference.isEmpty().toPromise()).to.be.true;
        });
    });

    describe('isReference()', function () {
        it('should return false', function () {
            expect(reference.isReference()).to.be.false;
        });
    });

    describe('isReferenceable()', function () {
        it('should return true', function () {
            expect(reference.isReferenceable()).to.be.true;
        });
    });

    describe('isSet()', function () {
        it('should return false', async function () {
            expect(await reference.isSet().toPromise()).to.be.false;
        });
    });

    describe('setValue()', function () {
        it('should raise an error', function () {
            expect(function () {
                reference.setValue(sinon.createStubInstance(Value));
            }).to.throw(
                'Fake PHP Fatal error for #core.undeclared_static_property with {"propertyName":"myProperty"}'
            );
        });
    });

    describe('toPromise()', function () {
        it('should raise an error', function () {
            expect(function () {
                reference.toPromise();
            }).to.throw(
                'Fake PHP Fatal error for #core.undeclared_static_property with {"propertyName":"myProperty"}'
            );
        });
    });
});
