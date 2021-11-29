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
    configOptionsAndInfoFunctions = require('../../../../../src/builtin/functions/optionsAndInfo/config'),
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    tools = require('../../../tools'),
    CallStack = require('../../../../../src/CallStack'),
    INIState = require('../../../../../src/INIState'),
    PHPError = phpCommon.PHPError,
    Variable = require('../../../../../src/Variable').sync();

describe('PHP "ini_set" builtin function', function () {
    var callStack,
        ini_set,
        iniState,
        optionNameReference,
        optionValueReference,
        state,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState(null, {
            'call_stack': callStack
        });
        iniState = sinon.createStubInstance(INIState);
        optionNameReference = sinon.createStubInstance(Variable);
        optionValueReference = sinon.createStubInstance(Variable);
        valueFactory = state.getValueFactory();

        iniState.get.withArgs('my_defined_ini_option').returns(1001);
        iniState.get.withArgs('my_undefined_ini_option').returns(null);
        iniState.set.callsFake(function (name, value) {
            iniState.get.withArgs(name).returns(value);
        });

        ini_set = configOptionsAndInfoFunctions({
            callStack: callStack,
            iniState: iniState,
            valueFactory: valueFactory
        }).ini_set;
    });

    describe('when the INI option is defined', function () {
        beforeEach(function () {
            optionNameReference.getValue.returns(valueFactory.createString('my_defined_ini_option'));
            optionValueReference.getValue.returns(valueFactory.createInteger(909));
        });

        it('should set the new value on the INIState', function () {
            ini_set(optionNameReference, optionValueReference);

            expect(iniState.set).to.have.been.calledOnce;
            expect(iniState.set).to.have.been.calledWith('my_defined_ini_option', 909);
        });

        it('should return its old value coerced to a Value object', function () {
            var resultValue = ini_set(optionNameReference, optionValueReference);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1001); // Check the old and not the new value is returned
        });
    });

    describe('when the INI option is not defined', function () {
        beforeEach(function () {
            optionNameReference.getValue.returns(valueFactory.createString('my_undefined_ini_option'));
            optionValueReference.getValue.returns(valueFactory.createInteger(21));
        });

        it('should not set the new value on the INIState', function () {
            ini_set(optionNameReference, optionValueReference);

            expect(iniState.set).not.to.have.been.called;
        });

        it('should return bool(false)', function () {
            var resultValue = ini_set(optionNameReference, optionValueReference);

            expect(resultValue.getType()).to.equal('boolean');
            expect(resultValue.getNative()).to.be.false;
        });
    });

    describe('when no arguments are provided', function () {
        it('should raise a warning', function () {
            ini_set();

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'ini_set() expects exactly 2 parameters, 0 given'
            );
        });

        it('should return NULL', function () {
            var result = ini_set();

            expect(result.getType()).to.equal('null');
        });
    });
});
