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
    ValueCoercer = require('../../../../src/FFI/Value/ValueCoercer'),
    ValueFactory = require('../../../../src/ValueFactory').sync();

describe('FFI ValueCoercer', function () {
    var createCoercer,
        valueCoercer,
        valueFactory;

    beforeEach(function () {
        valueFactory = new ValueFactory();

        createCoercer = function (autoCoercionEnabled) {
            valueCoercer = new ValueCoercer(autoCoercionEnabled);
        };
    });

    describe('coerceArguments()', function () {
        describe('in auto-coercing mode', function () {
            beforeEach(function () {
                createCoercer(true);
            });

            it('should coerce the arguments to native values', function () {
                var argumentValue1 = valueFactory.createString('first arg'),
                    argumentValue2 = valueFactory.createString('second arg');

                expect(valueCoercer.coerceArguments([argumentValue1, argumentValue2]))
                    .to.deep.equal(['first arg', 'second arg']);
            });
        });

        describe('in non-coercing mode', function () {
            beforeEach(function () {
                createCoercer(false);
            });

            it('should return the argument Values unchanged', function () {
                var argumentValue1 = valueFactory.createString('first arg'),
                    argumentValue2 = valueFactory.createString('second arg'),
                    result = valueCoercer.coerceArguments([argumentValue1, argumentValue2]);

                expect(result[0]).to.equal(argumentValue1);
                expect(result[1]).to.equal(argumentValue2);
            });
        });
    });
});
