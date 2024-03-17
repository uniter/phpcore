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
    var anotherType,
        anyType,
        myAndAnotherType,
        myType,
        parameterFactory,
        parser,
        typeProvider,
        yourAndNullUnionType,
        yourAndNumberUnionType,
        yourAndTheirUnionType,
        yourType;

    beforeEach(function () {
        anotherType = sinon.createStubInstance(TypeInterface);
        anyType = sinon.createStubInstance(AnyType);
        myAndAnotherType = sinon.createStubInstance(TypeInterface);
        myType = sinon.createStubInstance(TypeInterface);
        parameterFactory = sinon.createStubInstance(ParameterFactory);
        typeProvider = sinon.createStubInstance(TypeProvider);
        yourAndNullUnionType = sinon.createStubInstance(TypeInterface);
        yourAndNumberUnionType = sinon.createStubInstance(TypeInterface);
        yourAndTheirUnionType = sinon.createStubInstance(TypeInterface);
        yourType = sinon.createStubInstance(TypeInterface);

        parameterFactory.createParameter.callsFake(
            function (name, type, isRequired, isVariadic, defaultArgument) {
                var parameter = sinon.createStubInstance(Parameter);

                parameter.getDefaultArgument.returns(defaultArgument);
                parameter.getName.returns(name);
                parameter.getType.returns(type);
                parameter.isRequired.returns(isRequired);
                parameter.isVariadic.returns(isVariadic);

                return parameter;
            }
        );

        typeProvider.provideType
            .withArgs('another_type')
            .returns(anotherType);
        typeProvider.provideAnyType.returns(anyType);
        typeProvider.provideType
            .withArgs('my_type|another_type')
            .returns(myAndAnotherType);
        typeProvider.provideType
            .withArgs('my_type')
            .returns(myType);
        typeProvider.provideType
            .withArgs('your_type')
            .returns(yourType);
        typeProvider.provideType
            .withArgs('your_type|null')
            .returns(yourAndNullUnionType);
        typeProvider.provideType
            .withArgs('your_type|number')
            .returns(yourAndNumberUnionType);
        typeProvider.provideType
            .withArgs('your_type|their_type')
            .returns(yourAndTheirUnionType);

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
            var signature = parser.parseSignature(
                'my_type firstParam, your_type|their_type secondParam : my_type|another_type'
            );

            expect(signature.getParameterCount()).to.equal(2);
            expect(signature.getParameters()[0].getType()).to.equal(myType);
            expect(signature.getParameters()[0].getName()).to.equal('firstParam');
            expect(signature.getParameters()[0].isRequired()).to.be.true;
            expect(signature.getParameters()[0].isVariadic()).to.be.false;
            expect(signature.getParameters()[1].getType()).to.equal(yourAndTheirUnionType);
            expect(signature.getParameters()[1].getName()).to.equal('secondParam');
            expect(signature.getParameters()[1].isRequired()).to.be.true;
            expect(signature.getParameters()[1].isVariadic()).to.be.false;
            expect(signature.hasVariadicParameter()).to.be.false;
            expect(signature.getReturnType()).to.equal(myAndAnotherType);
        });

        it('should be able to parse a signature with default arguments plus a return type', function () {
            var signature = parser.parseSignature(
                'my_type firstParam, your_type|null secondParam = null : another_type'
            );

            expect(signature.getParameterCount()).to.equal(2);
            expect(signature.getParameters()[0].getType()).to.equal(myType);
            expect(signature.getParameters()[0].getName()).to.equal('firstParam');
            expect(signature.getParameters()[0].isRequired()).to.be.true;
            expect(signature.getParameters()[0].isVariadic()).to.be.false;
            expect(signature.getParameters()[1].getType()).to.equal(yourAndNullUnionType);
            expect(signature.getParameters()[1].getName()).to.equal('secondParam');
            expect(signature.getParameters()[1].getDefaultArgument()).to.be.null;
            expect(signature.getParameters()[1].isRequired()).to.be.false;
            expect(signature.getParameters()[1].isVariadic()).to.be.false;
            expect(signature.hasVariadicParameter()).to.be.false;
            expect(signature.getReturnType()).to.equal(anotherType);
        });

        it('should be able to parse a signature using number type with default arguments plus a return type', function () {
            var signature = parser.parseSignature(
                'my_type firstParam, your_type|number secondParam = 123 : another_type'
            );

            expect(signature.getParameterCount()).to.equal(2);
            expect(signature.getParameters()[0].getType()).to.equal(myType);
            expect(signature.getParameters()[0].getName()).to.equal('firstParam');
            expect(signature.getParameters()[0].isRequired()).to.be.true;
            expect(signature.getParameters()[0].isVariadic()).to.be.false;
            expect(signature.getParameters()[1].getType()).to.equal(yourAndNumberUnionType);
            expect(signature.getParameters()[1].getName()).to.equal('secondParam');
            expect(signature.getParameters()[1].getDefaultArgument()).to.equal(123);
            expect(signature.getParameters()[1].isRequired()).to.be.false;
            expect(signature.getParameters()[1].isVariadic()).to.be.false;
            expect(signature.hasVariadicParameter()).to.be.false;
            expect(signature.getReturnType()).to.equal(anotherType);
        });

        it('should be able to parse a signature with typed parameters but no return type', function () {
            var signature = parser.parseSignature('my_type firstParam, your_type secondParam');

            expect(signature.getParameterCount()).to.equal(2);
            expect(signature.getParameters()[0].getType()).to.equal(myType);
            expect(signature.getParameters()[0].getName()).to.equal('firstParam');
            expect(signature.getParameters()[0].isRequired()).to.be.true;
            expect(signature.getParameters()[0].isVariadic()).to.be.false;
            expect(signature.getParameters()[1].getType()).to.equal(yourType);
            expect(signature.getParameters()[1].getName()).to.equal('secondParam');
            expect(signature.getParameters()[1].isRequired()).to.be.true;
            expect(signature.getParameters()[1].isVariadic()).to.be.false;
            expect(signature.hasVariadicParameter()).to.be.false;
            expect(signature.getReturnType()).to.equal(anyType);
        });

        it('should be able to parse a signature with variadic parameter plus a return type', function () {
            var signature = parser.parseSignature('my_type firstParam, your_type ...secondParam : my_type');

            expect(signature.getParameterCount()).to.equal(2);
            expect(signature.getParameters()[0].getType()).to.equal(myType);
            expect(signature.getParameters()[0].getName()).to.equal('firstParam');
            expect(signature.getParameters()[0].isRequired()).to.be.true;
            expect(signature.getParameters()[0].isVariadic()).to.be.false;
            expect(signature.getParameters()[1].getType()).to.equal(yourType);
            expect(signature.getParameters()[1].getName()).to.equal('secondParam');
            expect(signature.getParameters()[1].isRequired()).to.be.true;
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
