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
    CallStack = require('../../../../../src/CallStack'),
    INIState = require('../../../../../src/INIState'),
    PHPError = phpCommon.PHPError,
    ValueFactory = require('../../../../../src/ValueFactory').sync(),
    Variable = require('../../../../../src/Variable').sync();

describe('PHP "ini_set" builtin function', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.iniState = sinon.createStubInstance(INIState);
        this.optionNameReference = sinon.createStubInstance(Variable);
        this.optionValueReference = sinon.createStubInstance(Variable);
        this.valueFactory = new ValueFactory();

        this.iniState.get.withArgs('my_defined_ini_option').returns(1001);
        this.iniState.get.withArgs('my_undefined_ini_option').returns(null);
        this.iniState.set.callsFake(function (name, value) {
            this.iniState.get.withArgs(name).returns(value);
        }.bind(this));

        this.ini_set = configOptionsAndInfoFunctions({
            callStack: this.callStack,
            iniState: this.iniState,
            valueFactory: this.valueFactory
        }).ini_set;
    });

    describe('when the INI option is defined', function () {
        beforeEach(function () {
            this.optionNameReference.getValue.returns(this.valueFactory.createString('my_defined_ini_option'));
            this.optionValueReference.getValue.returns(this.valueFactory.createInteger(909));
        });

        it('should set the new value on the INIState', function () {
            this.ini_set(this.optionNameReference, this.optionValueReference);

            expect(this.iniState.set).to.have.been.calledOnce;
            expect(this.iniState.set).to.have.been.calledWith('my_defined_ini_option', 909);
        });

        it('should return its old value coerced to a Value object', function () {
            var resultValue = this.ini_set(this.optionNameReference, this.optionValueReference);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1001); // Check the old and not the new value is returned
        });
    });

    describe('when the INI option is not defined', function () {
        beforeEach(function () {
            this.optionNameReference.getValue.returns(this.valueFactory.createString('my_undefined_ini_option'));
            this.optionValueReference.getValue.returns(this.valueFactory.createInteger(21));
        });

        it('should not set the new value on the INIState', function () {
            this.ini_set(this.optionNameReference, this.optionValueReference);

            expect(this.iniState.set).not.to.have.been.called;
        });

        it('should return bool(false)', function () {
            var resultValue = this.ini_set(this.optionNameReference, this.optionValueReference);

            expect(resultValue.getType()).to.equal('boolean');
            expect(resultValue.getNative()).to.be.false;
        });
    });

    describe('when no arguments are provided', function () {
        it('should raise a warning', function () {
            this.ini_set();

            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'ini_set() expects exactly 2 parameters, 0 given'
            );
        });

        it('should return NULL', function () {
            var result = this.ini_set();

            expect(result.getType()).to.equal('null');
        });
    });
});
