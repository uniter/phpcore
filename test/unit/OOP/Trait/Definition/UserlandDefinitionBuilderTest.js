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
    CallInstrumentation = require('../../../../../src/Instrumentation/CallInstrumentation'),
    CallStack = require('../../../../../src/CallStack'),
    FFIFactory = require('../../../../../src/FFI/FFIFactory'),
    Namespace = require('../../../../../src/Namespace').sync(),
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    Trait = require('../../../../../src/OOP/Trait/Trait'),
    UserlandDefinitionBuilder = require('../../../../../src/OOP/Trait/Definition/UserlandDefinitionBuilder'),
    ValueCoercer = require('../../../../../src/FFI/Value/ValueCoercer');

describe('UserlandDefinitionBuilder', function () {
    var builder,
        callStack,
        ffiFactory,
        namespace,
        namespaceScope,
        state,
        valueCoercer,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        callStack = sinon.createStubInstance(CallStack);
        ffiFactory = sinon.createStubInstance(FFIFactory);
        namespace = sinon.createStubInstance(Namespace);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        valueCoercer = sinon.createStubInstance(ValueCoercer);
        valueFactory = state.getValueFactory();

        ffiFactory.createValueCoercer.returns(valueCoercer);
        callStack.getCurrentInstrumentation.returns(sinon.createStubInstance(CallInstrumentation));
        namespace.getName.returns('My\\Stuff');
        namespace.getPrefix.returns('My\\Stuff\\');

        builder = new UserlandDefinitionBuilder(
            callStack,
            valueFactory,
            ffiFactory
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

        it('should throw an error when given a function definition', function () {
            expect(function () {
                builder.buildDefinition(
                    'MyTrait',
                    function () {}, // Not an object
                    namespace,
                    namespaceScope,
                    traits
                );
            }).to.throw('UserlandDefinitionBuilder :: Expected a plain object');
        });

        it('should create a value coercer with auto-coercion disabled', function () {
            definition = {
                constants: {},
                properties: {},
                staticProperties: {},
                methods: {}
            };

            builder.buildDefinition(
                'MyTrait',
                definition,
                namespace,
                namespaceScope,
                traits
            );

            expect(ffiFactory.createValueCoercer).to.have.been.calledWith(false);
        });

        it('should include constants from the definition', function () {
            definition = {
                constants: {
                    'MY_CONSTANT': function () { return 'constant value'; }
                },
                properties: {},
                staticProperties: {},
                methods: {}
            };

            var result = builder.buildDefinition(
                'MyTrait',
                definition,
                namespace,
                namespaceScope,
                traits
            );

            expect(result.getConstants()).to.deep.equal({
                'MY_CONSTANT': {
                    value: definition.constants.MY_CONSTANT
                }
            });
        });

        it('should include instance properties from the definition', function () {
            definition = {
                constants: {},
                properties: {
                    'myProp': { value: 'property value' }
                },
                staticProperties: {},
                methods: {}
            };

            var result = builder.buildDefinition(
                'MyTrait',
                definition,
                namespace,
                namespaceScope,
                traits
            );

            expect(result.getInstanceProperties()).to.deep.equal({
                'myProp': { value: 'property value' }
            });
        });

        it('should include static properties from the definition', function () {
            definition = {
                constants: {},
                properties: {},
                staticProperties: {
                    'myStaticProp': { value: 'static value' }
                },
                methods: {}
            };

            var result = builder.buildDefinition(
                'MyTrait',
                definition,
                namespace,
                namespaceScope,
                traits
            );

            expect(result.getStaticProperties()).to.deep.equal({
                'myStaticProp': { value: 'static value' }
            });
        });

        it('should include methods from the definition', function () {
            var method = function () {},
                result;
            definition = {
                constants: {},
                properties: {},
                staticProperties: {},
                methods: {
                    'myMethod': {
                        args: [],
                        isStatic: false,
                        line: 123,
                        method: method
                    }
                }
            };

            result = builder.buildDefinition(
                'MyTrait',
                definition,
                namespace,
                namespaceScope,
                traits
            );

            expect(result.getMethods()).to.deep.equal({
                'myMethod': {
                    args: [],
                    isStatic: false,
                    line: 123,
                    method: method
                }
            });
        });

        it('should return a TraitDefinition with the correct parameters', function () {
            definition = {
                constants: {},
                properties: {},
                staticProperties: {},
                methods: {}
            };

            var result = builder.buildDefinition(
                'MyTrait',
                definition,
                namespace,
                namespaceScope,
                traits
            );

            expect(result.getName()).to.equal('My\\Stuff\\MyTrait');
            expect(result.getNamespace()).to.equal(namespace);
            expect(result.getNamespaceScope()).to.equal(namespaceScope);
            expect(result.getTraits()).to.deep.equal(traits);
            expect(result.getValueCoercer()).to.equal(valueCoercer);
        });
    });
}); 