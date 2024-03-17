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
    Parameter = require('../../../../../src/Core/Opcode/Parameter/Parameter'),
    Signature = require('../../../../../src/Core/Opcode/Signature/Signature'),
    TypeInterface = require('../../../../../src/Core/Opcode/Type/TypeInterface');

describe('Opcode Signature', function () {
    var createSignature,
        myType,
        parameter1,
        parameter2,
        parameters,
        returnType,
        signature,
        yourType;

    beforeEach(function () {
        myType = sinon.createStubInstance(TypeInterface);
        parameter1 = sinon.createStubInstance(Parameter);
        parameter2 = sinon.createStubInstance(Parameter);
        returnType = sinon.createStubInstance(TypeInterface);
        yourType = sinon.createStubInstance(TypeInterface);

        parameter1.isVariadic.returns(false);
        parameter2.isVariadic.returns(false);
        parameters = [parameter1, parameter2];

        createSignature = function () {
            signature = new Signature(parameters, returnType);
        };
    });

    describe('getParameterCount()', function () {
        it('should return the number of parameters in the signature', function () {
            createSignature();

            expect(signature.getParameterCount()).to.equal(2);
        });
    });

    describe('getVariadicParameter()', function () {
        it('should return the parameter when the signature has a variadic parameter', function () {
            parameter2.isVariadic.returns(true);
            createSignature();

            expect(signature.getVariadicParameter()).to.equal(parameter2);
        });

        it('should return null when the signature defines no parameters', function () {
            parameters.length = 0;
            createSignature();

            expect(signature.getVariadicParameter()).to.be.null;
        });

        it('should return null when the signature has only formal parameters', function () {
            createSignature();

            expect(signature.getVariadicParameter()).to.be.null;
        });
    });

    describe('hasVariadicParameter()', function () {
        it('should return false when the signature defines no parameters', function () {
            parameters.length = 0;
            createSignature();

            expect(signature.hasVariadicParameter()).to.be.false;
        });

        it('should return false when the signature has only formal parameters', function () {
            createSignature();

            expect(signature.hasVariadicParameter()).to.be.false;
        });

        it('should return true when the signature has a variadic parameter', function () {
            parameter2.isVariadic.returns(true);
            createSignature();

            expect(signature.hasVariadicParameter()).to.be.true;
        });
    });
});
