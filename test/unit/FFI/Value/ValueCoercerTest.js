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
    tools = require('../../tools'),
    ValueCoercer = require('../../../../src/FFI/Value/ValueCoercer'),
    Variable = require('../../../../src/Variable').sync();

describe('FFI ValueCoercer', function () {
    var createCoercer,
        flow,
        state,
        valueCoercer,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        flow = state.getFlow();
        valueFactory = state.getValueFactory();

        createCoercer = function (autoCoercionEnabled) {
            valueCoercer = new ValueCoercer(flow, autoCoercionEnabled);
        };
    });

    describe('coerceArguments()', function () {
        describe('in auto-coercing mode', function () {
            beforeEach(function () {
                createCoercer(true);
            });

            it('should coerce the arguments to native values', async function () {
                var argumentValue1 = valueFactory.createString('first arg'),
                    argumentValue2 = valueFactory.createString('second arg');

                expect(await valueCoercer.coerceArguments([argumentValue1, argumentValue2]).toPromise())
                    .to.deep.equal(['first arg', 'second arg']);
            });

            it('should not raise notices/warnings on undefined references', async function () {
                var variable1 = sinon.createStubInstance(Variable),
                    variable2 = sinon.createStubInstance(Variable),
                    argumentValue1 = valueFactory.createString('first arg'),
                    argumentValue2 = valueFactory.createString('second arg');
                variable1.getValueOrNull.returns(argumentValue1);
                variable2.getValueOrNull.returns(argumentValue2);

                expect(await valueCoercer.coerceArguments([variable1, variable2]).toPromise())
                    .to.deep.equal(['first arg', 'second arg']);
                expect(variable1.getValueOrNull).to.have.been.calledOnce;
                expect(variable2.getValueOrNull).to.have.been.calledOnce;
            });
        });

        describe('in non-coercing mode', function () {
            beforeEach(function () {
                createCoercer(false);
            });

            it('should return the argument Values unchanged', async function () {
                var argumentValue1 = valueFactory.createString('first arg'),
                    argumentValue2 = valueFactory.createString('second arg'),
                    result = await valueCoercer.coerceArguments([argumentValue1, argumentValue2]).toPromise();

                expect(result[0]).to.equal(argumentValue1);
                expect(result[1]).to.equal(argumentValue2);
            });
        });
    });
});
