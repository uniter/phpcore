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
    BooleanValue = require('../../../src/Value/Boolean').sync(),
    ObjectElementReference = require('../../../src/Reference/ObjectElement'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('ObjectElementReference', function () {
    beforeEach(function () {
        this.keyValue = sinon.createStubInstance(StringValue);
        this.objectValue = sinon.createStubInstance(ObjectValue);
        this.offsetExistsResultValue = sinon.createStubInstance(BooleanValue);
        this.offsetGetResultValue = sinon.createStubInstance(Value);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.objectValue.callMethod.withArgs(
            'offsetExists',
            sinon.match([sinon.match.same(this.keyValue)])
        ).returns(this.offsetExistsResultValue);
        this.objectValue.callMethod.withArgs(
            'offsetGet',
            sinon.match([sinon.match.same(this.keyValue)])
        ).returns(this.offsetGetResultValue);

        this.reference = new ObjectElementReference(this.valueFactory, this.objectValue, this.keyValue);
    });

    describe('isEmpty()', function () {
        it('should return true when ArrayAccess::offsetExists(...) returns false', function () {
            this.offsetExistsResultValue.getNative.returns(false);

            expect(this.reference.isEmpty()).to.be.true;
        });

        it('should return true when ArrayAccess::offsetExists(...) returns true but ::offsetGet(...) empty', function () {
            this.offsetExistsResultValue.getNative.returns(true);
            this.offsetGetResultValue.isEmpty.returns(true);

            expect(this.reference.isEmpty()).to.be.true;
        });

        it('should return false when ArrayAccess::offsetExists(...) returns true and ::offsetGet(...) not empty', function () {
            this.offsetExistsResultValue.getNative.returns(true);
            this.offsetGetResultValue.isEmpty.returns(false);

            expect(this.reference.isEmpty()).to.be.false;
        });
    });
});

