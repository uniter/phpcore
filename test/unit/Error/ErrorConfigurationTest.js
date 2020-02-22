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
    ErrorConfiguration = require('../../../src/Error/ErrorConfiguration'),
    INIState = require('../../../src/INIState');

describe('ErrorConfiguration', function () {
    beforeEach(function () {
        this.iniState = sinon.createStubInstance(INIState);

        this.iniState.get.withArgs('display_errors').returns('1');
        this.iniState.get.withArgs('error_reporting').returns(1234);
        this.iniState.set.callsFake(function (name, value) {
            this.iniState.get.withArgs(name).returns(value);
        }.bind(this));

        this.errorConfiguration = new ErrorConfiguration(this.iniState);
    });

    describe('getDisplayErrors()', function () {
        it('should return true when the INI option is set to boolean true', function () {
            this.iniState.get.withArgs('display_errors').returns(true);

            expect(this.errorConfiguration.getDisplayErrors()).to.be.true;
        });

        it('should return false when the INI option is set to boolean false', function () {
            this.iniState.get.withArgs('display_errors').returns(false);

            expect(this.errorConfiguration.getDisplayErrors()).to.be.false;
        });

        it('should return true when the INI option is set to the string "On"', function () {
            this.iniState.get.withArgs('display_errors').returns('On');

            expect(this.errorConfiguration.getDisplayErrors()).to.be.true;
        });

        it('should return false when the INI option is set to the string "Off"', function () {
            this.iniState.get.withArgs('display_errors').returns('Off');

            expect(this.errorConfiguration.getDisplayErrors()).to.be.false;
        });
    });

    describe('getErrorReportingLevel()', function () {
        it('should return the level when the INI option is set to an integer', function () {
            expect(this.errorConfiguration.getErrorReportingLevel()).to.equal(1234);
        });

        it('should coerce the INI option to an integer', function () {
            this.iniState.get.withArgs('error_reporting').returns('4321.21 & some random text');

            // Note that it should be coerced to an integer and not a float (.21 should be dropped)
            expect(this.errorConfiguration.getErrorReportingLevel()).to.equal(4321);
        });

        it('should coerce the INI option to an integer of base 10', function () {
            this.iniState.get.withArgs('error_reporting').returns('0x4321.21 & some random text');

            // Note that a "0x" hex prefix should be ignored
            expect(this.errorConfiguration.getErrorReportingLevel()).to.equal(0);
        });
    });

    describe('setErrorReportingLevel()', function () {
        it('should just set the given level as the "error_reporting" INI option without modification', function () {
            this.errorConfiguration.setErrorReportingLevel('4321.21 & some random text');

            expect(this.iniState.get('error_reporting')).to.equal('4321.21 & some random text');
        });
    });
});
