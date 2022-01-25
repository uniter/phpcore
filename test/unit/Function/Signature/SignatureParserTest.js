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
    tools = require('../../tools'),
    Exception = phpCommon.Exception,
    Signature = require('../../../../src/Function/Signature/Signature'),
    SignatureParser = require('../../../../src/Function/Signature/SignatureParser');

describe('SignatureParser', function () {
    var parser,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        valueFactory = state.getValueFactory();

        parser = new SignatureParser(valueFactory);
    });

    describe('parseSignature()', function () {
        it('should be able to parse a single by-value required mixed parameter', function () {
            var parameterSpecData,
                signature = parser.parseSignature('mixed $myParam');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            expect(parameterSpecData.value).to.be.null;
        });

        it('should be able to parse a single by-reference required mixed parameter', function () {
            var parameterSpecData,
                signature = parser.parseSignature('mixed &$myParam');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.true; // Parameter argument is passed by-reference.
            expect(parameterSpecData.value).to.be.null;
        });

        it('should be able to parse a single by-reference optional mixed parameter', function () {
            var defaultValue,
                parameterSpecData,
                signature = parser.parseSignature('mixed $myParam = 21');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('int');
            expect(defaultValue.getNative()).to.equal(21);
        });

        it('should be able to parse a single by-value optional default-array parameter', function () {
            var defaultValue,
                parameterSpecData,
                signature = parser.parseSignature('array $myParam = []');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.equal('array');
            expect(parameterSpecData.nullable).to.be.false;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('array');
            expect(defaultValue.getNative()).to.deep.equal([]);
        });

        it('should be able to parse a single by-value optional default-boolean parameter', function () {
            var defaultValue,
                parameterSpecData,
                signature = parser.parseSignature('mixed $myParam = false');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('boolean');
            expect(defaultValue.getNative()).to.be.false;
        });

        it('should be able to parse a single by-value required callable parameter', function () {
            var parameterSpecData,
                signature = parser.parseSignature('callable $myParam');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.equal('callable');
            expect(parameterSpecData.nullable).to.be.false;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            expect(parameterSpecData.value).to.be.null;
        });

        it('should be able to parse a single nullable required callable parameter', function () {
            var parameterSpecData,
                signature = parser.parseSignature('?callable $myParam');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.equal('callable');
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            expect(parameterSpecData.value).to.be.null;
        });

        it('should be able to parse a single nullable required callable parameter with erratic whitespace', function () {
            var parameterSpecData,
                signature = parser.parseSignature('  ? callable    $myParam ');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.equal('callable');
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            expect(parameterSpecData.value).to.be.null;
        });

        it('should be able to parse a single by-value optional default-float parameter', function () {
            var defaultValue,
                parameterSpecData,
                signature = parser.parseSignature('mixed $myParam = 123.456');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('float');
            expect(defaultValue.getNative()).to.equal(123.456);
        });

        it('should be able to parse a single by-value optional default-integer mixed parameter', function () {
            var defaultValue,
                parameterSpecData,
                signature = parser.parseSignature('mixed $myParam = 5678');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('int');
            expect(defaultValue.getNative()).to.equal(5678);
        });

        it('should be able to parse a single by-value optional nullable integer scalar parameter', function () {
            var defaultValue,
                parameterSpecData,
                signature = parser.parseSignature('?int $myParam = 5678');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.equal('scalar');
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.scalarType).to.equal('int');
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('int');
            expect(defaultValue.getNative()).to.equal(5678);
        });

        it('should be able to parse a single by-value required iterable parameter', function () {
            var parameterSpecData,
                signature = parser.parseSignature('iterable $myParam');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.equal('iterable');
            expect(parameterSpecData.nullable).to.be.false;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            expect(parameterSpecData.value).to.be.null;
        });

        it('should be able to parse a single by-value optional default-null parameter', function () {
            var defaultValue,
                parameterSpecData,
                signature = parser.parseSignature('mixed $myParam = null');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('null');
        });

        it('should be able to parse a single by-value optional default-string parameter', function () {
            var defaultValue,
                parameterSpecData,
                signature = parser.parseSignature('mixed $myParam = "my default string value"');

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(1);
            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('myParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('string');
            expect(defaultValue.getNative()).to.equal('my default string value');
        });

        it('should be able to parse multiple parameters of different kinds', function () {
            var defaultValue,
                parameterSpecData,
                signature = parser.parseSignature(
                    'array $arrayParam = [], mixed &$boolParam = true, mixed $floatParam = 123.45, ' +
                    'mixed $intParam = 1001, MyClass $requiredObjectParam, YourLib\\Stuff\\YourClass $optionalObjectParam = null, ' +
                    'mixed $stringParam = "my default string value \\\\ with \\" \\n escaped chars"'
                );

            expect(signature).to.be.an.instanceOf(Signature);
            expect(signature.getParameterCount()).to.equal(7);

            parameterSpecData = signature.getParametersSpecData()[0];
            expect(parameterSpecData.type).to.equal('array');
            expect(parameterSpecData.nullable).to.be.false;
            expect(parameterSpecData.name).to.equal('arrayParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('array');
            expect(defaultValue.getNative()).to.deep.equal([]);

            parameterSpecData = signature.getParametersSpecData()[1];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('boolParam');
            expect(parameterSpecData.ref).to.be.true; // This parameter is passed by-reference.
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('boolean');
            expect(defaultValue.getNative()).to.be.true;

            parameterSpecData = signature.getParametersSpecData()[2];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('floatParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('float');
            expect(defaultValue.getNative()).to.equal(123.45);

            parameterSpecData = signature.getParametersSpecData()[3];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('intParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('int');
            expect(defaultValue.getNative()).to.equal(1001);

            parameterSpecData = signature.getParametersSpecData()[4];
            expect(parameterSpecData.type).to.equal('class');
            expect(parameterSpecData.nullable).to.be.false;
            expect(parameterSpecData.className).to.equal('MyClass');
            expect(parameterSpecData.name).to.equal('requiredObjectParam');
            expect(parameterSpecData.ref).to.be.false;
            expect(parameterSpecData.value).to.be.null;

            parameterSpecData = signature.getParametersSpecData()[5];
            expect(parameterSpecData.type).to.equal('class');
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.className).to.equal('YourLib\\Stuff\\YourClass');
            expect(parameterSpecData.name).to.equal('optionalObjectParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('null');

            parameterSpecData = signature.getParametersSpecData()[6];
            expect(parameterSpecData.type).to.be.undefined; // "mixed" type is represented as undefined.
            expect(parameterSpecData.nullable).to.be.true;
            expect(parameterSpecData.name).to.equal('stringParam');
            expect(parameterSpecData.ref).to.be.false;
            defaultValue = parameterSpecData.value();
            expect(defaultValue.getType()).to.equal('string');
            expect(defaultValue.getNative()).to.equal('my default string value \\ with " \n escaped chars');
        });

        it('should throw an error when a default string literal is malformed', function () {
            expect(function () {
                parser.parseSignature('mixed $myParam = "my invalid \\ string value"');
            }).to.throw(
                Exception,
                'SignatureParser.parseSignature() :: ' +
                'Failed to parse string literal: "my invalid \\ string value" for parameter "myParam"'
            );
        });

        it('should throw an error when the signature is malformed', function () {
            expect(function () {
                parser.parseSignature('I am not a valid signature');
            }).to.throw(
                Exception,
                'SignatureParser.parseSignature() :: Invalid function signature: "I am not a valid signature"'
            );
        });
    });
});
