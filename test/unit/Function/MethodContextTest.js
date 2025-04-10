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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    Class = require('../../../src/Class').sync(),
    Exception = phpCommon.Exception,
    MethodContext = require('../../../src/Function/MethodContext'),
    Trait = require('../../../src/OOP/Trait/Trait');

describe('MethodContext', function () {
    let classObject;
    let context;

    beforeEach(function () {
        classObject = sinon.createStubInstance(Class);
        classObject.getName.returns('My\\Lib\\MyClass');

        context = new MethodContext(classObject, null, 'myMethod');
    });

    describe('getName()', function () {
        it('should return the correct string for an implicit static call', function () {
            expect(context.getName()).to.equal('My\\Lib\\MyClass::myMethod');
        });

        it('should return the correct string for an explicit static call', function () {
            expect(context.getName(true)).to.equal('My\\Lib\\MyClass::myMethod');
        });

        it('should return the correct string for an instance call', function () {
            expect(context.getName(false)).to.equal('My\\Lib\\MyClass->myMethod');
        });
    });

    describe('getReferenceBinding()', function () {
        it('should throw an Exception', function () {
            expect(function () {
                context.getReferenceBinding();
            }).to.throw(Exception, 'MethodContext.getReferenceBinding() :: Unsupported');
        });
    });

    describe('getTraceFrameName()', function () {
        it('should return the correct string for an implicit static call', function () {
            expect(context.getTraceFrameName()).to.equal('My\\Lib\\MyClass::myMethod');
        });

        it('should return the correct string for an explicit static call', function () {
            expect(context.getTraceFrameName(true)).to.equal('My\\Lib\\MyClass::myMethod');
        });

        it('should return the correct string for an instance call', function () {
            expect(context.getTraceFrameName(false)).to.equal('My\\Lib\\MyClass->myMethod');
        });
    });

    describe('getTrait()', function () {
        it('should return null when no trait is provided', function () {
            expect(context.getTrait()).to.be.null;
        });

        it('should return the trait object when provided', function () {
            const traitClassObject = sinon.createStubInstance(Class);
            const traitObject = sinon.createStubInstance(Trait);
            const traitContext = new MethodContext(traitClassObject, traitObject, 'myMethod');

            expect(traitContext.getTrait()).to.equal(traitObject);
        });
    });

    describe('getUnprefixedName()', function () {
        it('should return only the method name, excluding the class', function () {
            expect(context.getUnprefixedName()).to.equal('myMethod');
        });
    });

    describe('getValueBinding()', function () {
        it('should throw an Exception', function () {
            expect(function () {
                context.getValueBinding();
            }).to.throw(Exception, 'MethodContext.getValueBinding() :: Unsupported');
        });
    });
});
