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
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Class', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.superClass = sinon.createStubInstance(Class);
        this.valueFactory = sinon.createStubInstance(ValueFactory);
        this.InternalClass = sinon.stub();

        this.classObject = new Class(
            this.valueFactory,
            this.callStack,
            'My\\Class\\Path\\Here',
            '__construct',
            this.InternalClass,
            {},
            {},
            this.superClass,
            [],
            this.namespaceScope
        );
    });

    describe('is()', function () {
        it('should return true for the current class name case-insensitively', function () {
            expect(this.classObject.is('my\\CLASS\\path\\hEre')).to.be.true;
        });

        it('should return true when the superclass reports with true', function () {
            this.superClass.is.withArgs('Some\\Parent\\Class\\Path\\Here').returns(true);

            expect(this.classObject.is('Some\\Parent\\Class\\Path\\Here')).to.be.true;
        });

        it('should return false when not the current class or an ancestor class', function () {
            this.superClass.is.returns(false);

            expect(this.classObject.is('Some\\Class\\Or\\Other')).to.be.false;
        });
    });
});
