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
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    IntegerValue = require('../../src/Value/Integer').sync(),
    Namespace = require('../../src/Namespace').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('ValueFactory', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.pausable = {};

        this.factory = new ValueFactory(this.pausable, this.callStack);
        this.factory.setGlobalNamespace(this.globalNamespace);
    });

    describe('createExit()', function () {
        it('should return an ExitValue with the specified status balue', function () {
            var statusValue = sinon.createStubInstance(IntegerValue);
            statusValue.getNative.returns(21);

            expect(this.factory.createExit(statusValue).getStatus()).to.equal(21);
        });
    });

    describe('createStdClassObject()', function () {
        it('should return an ObjectValue wrapping the created stdClass instance', function () {
            var value = sinon.createStubInstance(ObjectValue),
                stdClassClass = sinon.createStubInstance(Class);
            this.globalNamespace.getClass.withArgs('stdClass').returns(stdClassClass);
            stdClassClass.instantiate.returns(value);

            expect(this.factory.createStdClassObject()).to.equal(value);
        });
    });
});
