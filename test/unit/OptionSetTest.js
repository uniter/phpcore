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
    OptionSet = require('../../src/OptionSet');

describe('OptionSet', function () {
    beforeEach(function () {
        this.optionSet = new OptionSet({
            'truthy-option': 21,
            'falsy-option': 0
        });
    });

    describe('getOption()', function () {
        it('should return the option when truthy', function () {
            expect(this.optionSet.getOption('truthy-option')).to.equal(21);
        });

        it('should return the option when falsy', function () {
            expect(this.optionSet.getOption('falsy-option')).to.equal(0);
        });
    });
});
