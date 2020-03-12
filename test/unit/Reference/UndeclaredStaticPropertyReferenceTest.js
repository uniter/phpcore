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
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    PHPError = phpCommon.PHPError,
    UndeclaredStaticPropertyReference = require('../../../src/Reference/UndeclaredStaticProperty'),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('UndeclaredStaticPropertyReference', function () {
    var callStack,
        classObject,
        reference,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        classObject = sinon.createStubInstance(Class);
        valueFactory = new ValueFactory();

        callStack.raiseTranslatedError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, translationKey, placeholderVariables) {
                throw new Error(
                    'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
                );
            });

        reference = new UndeclaredStaticPropertyReference(valueFactory, callStack, classObject, 'myProperty');
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

    describe('getValueOrNull()', function () {
        it('should return a NullValue', function () {
            expect(reference.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('isDefined()', function () {
        it('should return false', function () {
            expect(reference.isDefined()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true', function () {
            expect(reference.isEmpty()).to.be.true;
        });
    });

    describe('isSet()', function () {
        it('should return false', function () {
            expect(reference.isSet()).to.be.false;
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
});
