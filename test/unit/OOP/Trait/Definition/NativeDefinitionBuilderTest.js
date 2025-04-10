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
    tools = require('../../../tools'),
    FFIFactory = require('../../../../../src/FFI/FFIFactory'),
    Namespace = require('../../../../../src/Namespace').sync(),
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    NativeDefinitionBuilder = require('../../../../../src/OOP/Trait/Definition/NativeDefinitionBuilder'),
    NativeMethodDefinitionBuilder = require('../../../../../src/OOP/NativeMethodDefinitionBuilder'),
    Trait = require('../../../../../src/OOP/Trait/Trait'),
    ValueCoercer = require('../../../../../src/FFI/Value/ValueCoercer');

describe('NativeDefinitionBuilder', function () {
    var builder,
        ffiFactory,
        namespace,
        namespaceScope,
        nativeMethodDefinitionBuilder,
        state,
        valueCoercer,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        ffiFactory = sinon.createStubInstance(FFIFactory);
        namespace = sinon.createStubInstance(Namespace);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        nativeMethodDefinitionBuilder = sinon.createStubInstance(NativeMethodDefinitionBuilder);
        valueCoercer = sinon.createStubInstance(ValueCoercer);
        valueFactory = state.getValueFactory();

        ffiFactory.createValueCoercer.returns(valueCoercer);
        namespace.getName.returns('My\\Stuff');
        namespace.getPrefix.returns('My\\Stuff\\');

        builder = new NativeDefinitionBuilder(
            valueFactory,
            ffiFactory,
            nativeMethodDefinitionBuilder
        );
    });

    describe('buildDefinition()', function () {
        var definition,
            traits;

        beforeEach(function () {
            traits = [
                sinon.createStubInstance(Trait)
            ];
        });

        it('should throw an error when given a non-function definition', function () {
            expect(function () {
                builder.buildDefinition(
                    'MyTrait',
                    {}, // Not a function.
                    namespace,
                    namespaceScope,
                    traits,
                    true
                );
            }).to.throw('NativeDefinitionBuilder :: Expected a function');
        });

        it('should create a value coercer with the given auto-coercion setting', function () {
            definition = function () {};
            definition.constants = {};

            builder.buildDefinition(
                'MyTrait',
                definition,
                namespace,
                namespaceScope,
                traits,
                true
            );

            expect(ffiFactory.createValueCoercer).to.have.been.calledWith(true);
        });

        it('should build method definitions from the prototype', function () {
            var method1 = function () {},
                method2 = function () {},
                method1Def = { args: [], isStatic: false, line: 123, method: method1 },
                method2Def = { args: [], isStatic: false, line: 456, method: method2 },
                result;

            definition = function () {};
            definition.prototype = {
                method1: method1,
                method2: method2
            };
            definition.constants = {};

            nativeMethodDefinitionBuilder.buildMethod
                .withArgs(method1, valueCoercer)
                .returns(method1Def);
            nativeMethodDefinitionBuilder.buildMethod
                .withArgs(method2, valueCoercer)
                .returns(method2Def);

            result = builder.buildDefinition(
                'MyTrait',
                definition,
                namespace,
                namespaceScope,
                traits,
                true
            );

            expect(result.getMethods()).to.deep.equal({
                method1: method1Def,
                method2: method2Def
            });
        });

        it('should skip methods that return null from the method definition builder', function () {
            var method1 = function () {},
                method2 = function () {},
                method1Def = { args: [], isStatic: false, line: 123, method: method1 },
                result;

            definition = function () {};
            definition.prototype = {
                method1: method1,
                method2: method2
            };
            definition.constants = {};

            nativeMethodDefinitionBuilder.buildMethod
                .withArgs(method1, valueCoercer)
                .returns(method1Def);
            nativeMethodDefinitionBuilder.buildMethod
                .withArgs(method2, valueCoercer)
                .returns(null);

            result = builder.buildDefinition(
                'MyTrait',
                definition,
                namespace,
                namespaceScope,
                traits,
                true
            );

            expect(result.getMethods()).to.deep.equal({
                method1: method1Def
            });
        });

        it('should include constants from the definition', function () {
            var result;
            definition = function () {};
            definition.constants = {
                'MY_CONSTANT': function () { return 'constant value'; }
            };

            result = builder.buildDefinition(
                'MyTrait',
                definition,
                namespace,
                namespaceScope,
                traits,
                true
            );

            expect(result.getConstants()).to.deep.equal({
                'MY_CONSTANT': {
                    value: definition.constants.MY_CONSTANT
                }
            });
        });

        it('should return a TraitDefinition with the correct parameters', function () {
            var result;
            definition = function () {};
            definition.constants = {};

            result = builder.buildDefinition(
                'MyTrait',
                definition,
                namespace,
                namespaceScope,
                traits,
                true
            );

            expect(result.getName()).to.equal('My\\Stuff\\MyTrait');
            expect(result.getNamespace()).to.equal(namespace);
            expect(result.getNamespaceScope()).to.equal(namespaceScope);
            expect(result.getTraits()).to.deep.equal(traits);
            expect(result.getValueCoercer()).to.equal(valueCoercer);
        });
    });
}); 