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
    ArrayType = require('../../../src/Type/ArrayType'),
    CallableType = require('../../../src/Type/CallableType'),
    ClassType = require('../../../src/Type/ClassType'),
    IterableType = require('../../../src/Type/IterableType'),
    MixedType = require('../../../src/Type/MixedType'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    TypeFactory = require('../../../src/Type/TypeFactory');

describe('TypeFactory', function () {
    var factory;

    beforeEach(function () {
        factory = new TypeFactory();
    });

    describe('createArrayType()', function () {
        it('should return an ArrayType that allows null when specified', function () {
            var type = factory.createArrayType(true);

            expect(type).to.be.an.instanceOf(ArrayType);
            expect(type.allowsNull()).to.be.true;
        });

        it('should return an ArrayType that disallows null when specified', function () {
            var type = factory.createArrayType(false);

            expect(type).to.be.an.instanceOf(ArrayType);
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('createCallableType()', function () {
        var namespaceScope;

        beforeEach(function () {
            namespaceScope = sinon.createStubInstance(NamespaceScope);
        });

        it('should return a CallableType that allows null when specified', function () {
            var type = factory.createCallableType(namespaceScope, true);

            expect(type).to.be.an.instanceOf(CallableType);
            expect(type.allowsNull()).to.be.true;
        });

        it('should return a CallableType that disallows null when specified', function () {
            var type = factory.createCallableType(namespaceScope, false);

            expect(type).to.be.an.instanceOf(CallableType);
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('createClassType()', function () {
        it('should return a ClassType that allows null when specified', function () {
            var type = factory.createClassType('My\\Fqcn', true);

            expect(type).to.be.an.instanceOf(ClassType);
            expect(type.allowsNull()).to.be.true;
        });

        it('should return a ClassType that disallows null when specified', function () {
            var type = factory.createClassType('My\\Fqcn', false);

            expect(type).to.be.an.instanceOf(ClassType);
            expect(type.allowsNull()).to.be.false;
        });

        it('should give the ClassType the correct FQCN', function () {
            var type = factory.createClassType('My\\Fqcn', false);

            expect(type.getDisplayName()).to.equal('My\\Fqcn');
        });
    });

    describe('createIterableType()', function () {
        var namespaceScope;

        beforeEach(function () {
            namespaceScope = sinon.createStubInstance(NamespaceScope);
        });

        it('should return a IterableType that allows null when specified', function () {
            var type = factory.createIterableType(true);

            expect(type).to.be.an.instanceOf(IterableType);
            expect(type.allowsNull()).to.be.true;
        });

        it('should return a IterableType that disallows null when specified', function () {
            var type = factory.createIterableType(false);

            expect(type).to.be.an.instanceOf(IterableType);
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('createMixedType()', function () {
        var namespaceScope;

        beforeEach(function () {
            namespaceScope = sinon.createStubInstance(NamespaceScope);
        });

        it('should return a MixedType that allows null', function () {
            var type = factory.createMixedType();

            expect(type).to.be.an.instanceOf(MixedType);
            expect(type.allowsNull()).to.be.true;
        });
    });
});
