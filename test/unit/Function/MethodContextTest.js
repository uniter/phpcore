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
    Class = require('../../../src/Class').sync(),
    MethodContext = require('../../../src/Function/MethodContext');

describe('MethodContext', function () {
    beforeEach(function () {
        this.classObject = sinon.createStubInstance(Class);

        this.classObject.getName.returns('My\\Lib\\MyClass');

        this.context = new MethodContext(this.classObject, 'myMethod');
    });

    describe('getName()', function () {
        it('should return the correct string for an implicit static call', function () {
            expect(this.context.getName()).to.equal('My\\Lib\\MyClass::myMethod');
        });

        it('should return the correct string for an explicit static call', function () {
            expect(this.context.getName(true)).to.equal('My\\Lib\\MyClass::myMethod');
        });

        it('should return the correct string for an instance call', function () {
            expect(this.context.getName(false)).to.equal('My\\Lib\\MyClass->myMethod');
        });
    });

    describe('getTraceFrameName()', function () {
        it('should return the correct string for an implicit static call', function () {
            expect(this.context.getTraceFrameName()).to.equal('My\\Lib\\MyClass::myMethod');
        });

        it('should return the correct string for an explicit static call', function () {
            expect(this.context.getTraceFrameName(true)).to.equal('My\\Lib\\MyClass::myMethod');
        });

        it('should return the correct string for an instance call', function () {
            expect(this.context.getTraceFrameName(false)).to.equal('My\\Lib\\MyClass->myMethod');
        });
    });

    describe('getUnprefixedName()', function () {
        it('should return only the method name, excluding the class', function () {
            expect(this.context.getUnprefixedName()).to.equal('myMethod');
        });
    });
});
