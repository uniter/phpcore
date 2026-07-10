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
    sinon = require('sinon'),
    tools = require('../tools'),
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    TypedReferenceSlot = require('../../../src/Reference/TypedReferenceSlot'),
    TypeInterface = require('../../../src/Type/TypeInterface');

describe('TypedReferenceSlot', function () {
    var callStack,
        classObject,
        flow,
        futureFactory,
        referenceFactory,
        slot,
        state,
        typeObject,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        classObject = sinon.createStubInstance(Class);
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        referenceFactory = state.getReferenceFactory();
        typeObject = sinon.createStubInstance(TypeInterface);
        valueFactory = state.getValueFactory();

        callStack.getLastFilePath.returns('/path/to/my_module.php');
        callStack.getLastLine.returns(21);
        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        classObject.getName.returns('MyClass');

        typeObject.allowsValue.returns(futureFactory.createPresent(true));
        typeObject.getDisplayName.returns('int');

        slot = new TypedReferenceSlot(
            valueFactory,
            referenceFactory,
            futureFactory,
            callStack,
            flow,
            classObject,
            'count',
            typeObject,
            null
        );
    });

    describe('getValue()', function () {
        it('should return the initial PHP NULL value when none has been set', function () {
            expect(slot.getValue().getType()).to.equal('null');
        });

        it('should return a pre-validated initial value when one was given to the constructor', function () {
            var initialValue = valueFactory.createInteger(10),
                slotWithInitialValue = new TypedReferenceSlot(
                    valueFactory,
                    referenceFactory,
                    futureFactory,
                    callStack,
                    flow,
                    classObject,
                    'count',
                    typeObject,
                    initialValue
                );

            expect(slotWithInitialValue.getValue()).to.equal(initialValue);
        });
    });

    describe('setValue()', function () {
        describe('when the value passes the type check', function () {
            it('should store the value', async function () {
                var newValue = valueFactory.createInteger(42);
                typeObject.allowsValue.returns(futureFactory.createPresent(true));

                await slot.setValue(newValue).toPromise();

                expect(slot.getValue()).to.equal(newValue);
            });

            it('should return the value assigned', async function () {
                var newValue = valueFactory.createInteger(42),
                    result;
                typeObject.allowsValue.returns(futureFactory.createPresent(true));

                result = await slot.setValue(newValue).toPromise();

                expect(result).to.equal(newValue);
            });
        });

        describe('when the value fails the type check', function () {
            beforeEach(function () {
                typeObject.allowsValue.returns(futureFactory.createPresent(false));
            });

            it('should raise a TypeError fatal error', async function () {
                var stringValue = valueFactory.createString('not an int');

                await expect(slot.setValue(stringValue).toPromise()).to.eventually.be.rejectedWith(
                    'Fake PHP Fatal error for #core.cannot_assign_incompatible_reference_type with ' +
                    '{"className":"MyClass","propertyName":"count","expectedType":"int","actualType":"string"}'
                );
            });

            it('should raise the error with the current file path and line number as context', async function () {
                var stringValue = valueFactory.createString('not an int');

                await slot.setValue(stringValue).toPromise().catch(function () {});

                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError.args[0][7]).to.equal('core.error_in_file');
                expect(callStack.raiseTranslatedError.args[0][8]).to.deep.equal({
                    filePath: '/path/to/my_module.php',
                    lineNumber: 21
                });
            });

            it('should not store the value', async function () {
                var originalValue = valueFactory.createInteger(10),
                    stringValue;
                slot = new TypedReferenceSlot(
                    valueFactory,
                    referenceFactory,
                    futureFactory,
                    callStack,
                    flow,
                    classObject,
                    'count',
                    typeObject,
                    originalValue
                );
                stringValue = valueFactory.createString('not an int');

                await slot.setValue(stringValue).toPromise().catch(function () { /* Discard TypeError. */ });

                expect(slot.getValue()).to.equal(originalValue);
            });
        });
    });
});
