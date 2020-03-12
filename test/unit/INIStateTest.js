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
    INIState = require('../../src/INIState');

describe('INIState', function () {
    beforeEach(function () {
        this.iniState = new INIState();

        this.iniState.set('my_defined_option', 1234);
    });

    describe('get()', function () {
        it('should return a defined option', function () {
            expect(this.iniState.get('my_defined_option')).to.equal(1234);
        });

        it('should return null for an undefined option', function () {
            expect(this.iniState.get('my_undefined_option')).to.be.null;
        });
    });

    describe('set()', function () {
        it('should be able to change the value of an option', function () {
            this.iniState.set('my_defined_option', 4321);

            expect(this.iniState.get('my_defined_option')).to.equal(4321);
        });
    });
});
