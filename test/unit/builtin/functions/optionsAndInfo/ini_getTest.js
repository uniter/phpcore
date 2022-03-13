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
    sinon = require('sinon'),
    tools = require('../../../tools'),
    CallStack = require('../../../../../src/CallStack'),
    INIState = require('../../../../../src/INIState');

describe('PHP "ini_get" builtin function', function () {
    var callStack,
        ini_get,
        iniState,
        state,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState(null, {
            'call_stack': callStack
        });
        iniState = sinon.createStubInstance(INIState);
        valueFactory = state.getValueFactory();

        iniState.get.withArgs('my_defined_ini_option').returns(1001);
        iniState.get.withArgs('my_undefined_ini_option').returns(null);

        ini_get = configOptionsAndInfoFunctions({
            callStack: callStack,
            iniState: iniState,
            typeFunction: sinon.stub().callsFake(function (signature, func) {
                return func;
            }),
            valueFactory: valueFactory
        }).ini_get;
    });

    it('should return the INI option coerced to a Value object when it is defined', function () {
        var resultValue = ini_get(valueFactory.createString('my_defined_ini_option'));

        expect(resultValue.getType()).to.equal('int');
        expect(resultValue.getNative()).to.equal(1001);
    });

    it('should return bool(false) when the option is not defined', function () {
        var resultValue = ini_get(valueFactory.createString('my_undefined_ini_option'));

        expect(resultValue.getType()).to.equal('boolean');
        expect(resultValue.getNative()).to.be.false;
    });
});
