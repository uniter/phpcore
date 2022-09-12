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
    AnyType = require('../../../../../src/Core/Opcode/Type/AnyType'),
    Exception = phpCommon.Exception,
    Parameter = require('../../../../../src/Core/Opcode/Parameter/Parameter'),
    ParameterFactory = require('../../../../../src/Core/Opcode/Parameter/ParameterFactory'),
    SignatureParser = require('../../../../../src/Core/Opcode/Signature/SignatureParser'),
    TypeInterface = require('../../../../../src/Core/Opcode/Type/TypeInterface'),
    TypeProvider = require('../../../../../src/Core/Opcode/Type/TypeProvider');

describe('Opcode SignatureParser', function () {
    var anyType,
        myType,
        parameterFactory,
        parser,
        typeProvider,
        yourType;

    beforeEach(function () {
        anyType = sinon.createStubInstance(AnyType);
        myType = sinon.createStubInstance(TypeInterface);
        parameterFactory = sinon.createStubInstance(ParameterFactory);
        typeProvider = sinon.createStubInstance(TypeProvider);
        yourType = sinon.createStubInstance(TypeInterface);

        parameterFactory.createParameter.callsFake(function (name, type, isVariadic) {
            var parameter = sinon.createStubInstance(Parameter);

            parameter.getName.returns(name);
            parameter.getType.returns(type);
            parameter.isVariadic.returns(isVariadic);

            return parameter;
        });

        typeProvider.provideAnyType.returns(anyType);
        typeProvider.provideType
            .withArgs('my_type')
            .returns(myType);
        typeProvider.provideType
            .withArgs('your_type')
            .returns(yourType);

        parser = new SignatureParser(typeProvider, parameterFactory);
    });

    describe('parseSignature()', function () {
        it('should be able to parse an empty signature', function () {
            var signature = parser.parseSignature('');

            expect(signature.getParameterCount()).to.equal(0);
            expect(signature.hasVariadicParameter()).to.be.false;
            expect(signature.getReturnType()).to.equal(anyType);
        });

        it('should be able to parse a signature with only a return type', function () {
            var signature = parser.parseSignature(': my_type');

            expect(signature.getParameterCount()).to.equal(0);
            expect(signature.hasVariadicParameter()).to.be.false;
            expect(signature.getReturnType()).to.equal(myType);
        });

        it('should be able to parse a signature with typed parameters plus a return type', function () {
            var signature = parser.parseSignature('my_type firstParam, your_type secondParam : my_type');

            expect(signature.getParameterCount()).to.equal(2);
            expect(signature.getParameters()[0].getType()).to.equal(myType);
            expect(signature.getParameters()[0].getName()).to.equal('firstParam');
            expect(signature.getParameters()[0].isVariadic()).to.be.false;
            expect(signature.getParameters()[1].getType()).to.equal(yourType);
            expect(signature.getParameters()[1].getName()).to.equal('secondParam');
            expect(signature.getParameters()[1].isVariadic()).to.be.false;
            expect(signature.hasVariadicParameter()).to.be.false;
            expect(signature.getReturnType()).to.equal(myType);
        });

        it('should be able to parse a signature with typed parameters but no return type', function () {
            var signature = parser.parseSignature('my_type firstParam, your_type secondParam');

            expect(signature.getParameterCount()).to.equal(2);
            expect(signature.getParameters()[0].getType()).to.equal(myType);
            expect(signature.getParameters()[0].getName()).to.equal('firstParam');
            expect(signature.getParameters()[0].isVariadic()).to.be.false;
            expect(signature.getParameters()[1].getType()).to.equal(yourType);
            expect(signature.getParameters()[1].getName()).to.equal('secondParam');
            expect(signature.getParameters()[1].isVariadic()).to.be.false;
            expect(signature.hasVariadicParameter()).to.be.false;
            expect(signature.getReturnType()).to.equal(anyType);
        });

        it('should be able to parse a signature with variadic parameter plus a return type', function () {
            var signature = parser.parseSignature('my_type firstParam, your_type ...secondParam : my_type');

            expect(signature.getParameterCount()).to.equal(2);
            expect(signature.getParameters()[0].getType()).to.equal(myType);
            expect(signature.getParameters()[0].getName()).to.equal('firstParam');
            expect(signature.getParameters()[0].isVariadic()).to.be.false;
            expect(signature.getParameters()[1].getType()).to.equal(yourType);
            expect(signature.getParameters()[1].getName()).to.equal('secondParam');
            expect(signature.getParameters()[1].isVariadic()).to.be.true;
            expect(signature.hasVariadicParameter()).to.be.true;
            expect(signature.getReturnType()).to.equal(myType);
        });

        it('should throw when a parameter has no type given', function () {
            expect(function () {
                parser.parseSignature('untypedParam, my_type secondParam');
            }).to.throw(
                Exception,
                'SignatureParser.parseSignature() :: Invalid opcode signature ' +
                '"untypedParam, my_type secondParam" near "untypedParam, my_typ..."'
            );
        });

        it('should throw when a non-final parameter is specified as variadic', function () {
            expect(function () {
                parser.parseSignature('my_type firstParam, my_type ...invalidVariadicParam, your_type thirdParam');
            }).to.throw(
                Exception,
                'SignatureParser.parseSignature() :: Variadic parameter ' +
                '"invalidVariadicParam" must be the final parameter'
            );
        });
    });
});
