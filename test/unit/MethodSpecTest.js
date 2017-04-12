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
    Class = require('../../src/Class').sync(),
    MethodSpec = require('../../src/MethodSpec');

describe('MethodSpec', function () {
    beforeEach(function () {
        this.classObject = sinon.createStubInstance(Class);
        this.method = sinon.stub();
        this.originalClass = sinon.createStubInstance(Class);

        this.spec = new MethodSpec(this.originalClass, this.classObject, 'myMethod', this.method);
    });

    describe('getMethodName()', function () {
        it('should return the name of the method the spec is for', function () {
            expect(this.spec.getMethodName()).to.equal('myMethod');
        });
    });

    describe('isStatic()', function () {
        it('should return true for a static method', function () {
            this.method.isStatic = true;

            expect(this.spec.isStatic()).to.be.true;
        });

        it('should return false for an instance method', function () {
            expect(this.spec.isStatic()).to.be.false;
        });
    });
});
