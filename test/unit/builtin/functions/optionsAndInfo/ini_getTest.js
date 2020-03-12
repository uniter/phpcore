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

describe('PHP "ini_get" builtin function', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.iniState = sinon.createStubInstance(INIState);
        this.optionNameReference = sinon.createStubInstance(Variable);
        this.valueFactory = new ValueFactory();

        this.iniState.get.withArgs('my_defined_ini_option').returns(1001);
        this.iniState.get.withArgs('my_undefined_ini_option').returns(null);

        this.ini_get = configOptionsAndInfoFunctions({
            callStack: this.callStack,
            iniState: this.iniState,
            valueFactory: this.valueFactory
        }).ini_get;
    });

    it('should return the INI option coerced to a Value object when it is defined', function () {
        var resultValue;
        this.optionNameReference.getValue.returns(this.valueFactory.createString('my_defined_ini_option'));

        resultValue = this.ini_get(this.optionNameReference);

        expect(resultValue.getType()).to.equal('int');
        expect(resultValue.getNative()).to.equal(1001);
    });

    it('should return bool(false) when the option is not defined', function () {
        var resultValue;
        this.optionNameReference.getValue.returns(this.valueFactory.createString('my_undefined_ini_option'));

        resultValue = this.ini_get(this.optionNameReference);

        expect(resultValue.getType()).to.equal('boolean');
        expect(resultValue.getNative()).to.be.false;
    });

    describe('when no arguments are provided', function () {
        it('should raise a warning', function () {
            this.ini_get();

            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'ini_get() expects exactly 1 parameter, 0 given'
            );
        });

        it('should return NULL', function () {
            var result = this.ini_get();

            expect(result.getType()).to.equal('null');
        });
    });
});
