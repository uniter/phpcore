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
    Reference = require('../../../src/Reference/Reference'),
    ReferenceElement = require('../../../src/Element/ReferenceElement');

describe('ReferenceElement', function () {
    var element,
        reference;

    beforeEach(function () {
        reference = sinon.createStubInstance(Reference);

        element = new ReferenceElement(reference);
    });

    describe('asArrayElement()', function () {
        it('should return this element unchanged', function () {
            expect(element.asArrayElement()).to.equal(element);
        });
    });

    describe('getReference()', function () {
        it('should return the reference', function () {
            expect(element.getReference()).to.equal(reference);
        });
    });
});
