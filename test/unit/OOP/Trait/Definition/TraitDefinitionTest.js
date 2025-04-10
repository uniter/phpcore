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
    CallInstrumentation = require('../../../../../src/Instrumentation/CallInstrumentation'),
    Namespace = require('../../../../../src/Namespace').sync(),
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    Trait = require('../../../../../src/OOP/Trait/Trait'),
    TraitDefinition = require('../../../../../src/OOP/Trait/Definition/TraitDefinition'),
    ValueCoercer = require('../../../../../src/FFI/Value/ValueCoercer');

describe('TraitDefinition', function () {
    var definition,
        instrumentation,
        namespace,
        namespaceScope,
        valueCoercer;

    beforeEach(function () {
        namespace = sinon.createStubInstance(Namespace);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        valueCoercer = sinon.createStubInstance(ValueCoercer);
        instrumentation = sinon.createStubInstance(CallInstrumentation);

        definition = new TraitDefinition(
            'MyTrait',
            namespace,
            namespaceScope,
            [],
            {},
            {},
            {},
            {},
            valueCoercer,
            instrumentation
        );
    });

    describe('getConstants()', function () {
        it('should return the trait\'s constants', function () {
            var constants = {
                'MY_CONSTANT': { value: 'constant value' }
            };
            definition = new TraitDefinition(
                'MyTrait',
                namespace,
                namespaceScope,
                [],
                constants,
                {},
                {},
                {},
                valueCoercer,
                instrumentation
            );

            expect(definition.getConstants()).to.deep.equal(constants);
        });

        it('should not include constants from used traits', function () {
            var result,
                usedTrait = sinon.createStubInstance(Trait);
            usedTrait.getConstants.returns({
                'USED_TRAIT_CONSTANT': { value: 'from used trait' }
            });
            definition = new TraitDefinition(
                'MyTrait',
                namespace,
                namespaceScope,
                [usedTrait],
                { 'MY_CONSTANT': { value: 'my constant' } },
                {},
                {},
                {},
                valueCoercer,
                instrumentation
            );

            result = definition.getConstants();

            expect(result).not.to.have.property('USED_TRAIT_CONSTANT');
        });
    });

    describe('getInstanceProperties()', function () {
        it('should return the trait\'s instance properties', function () {
            var instanceProperties = {
                'myProp': { value: 'property value' }
            };
            definition = new TraitDefinition(
                'MyTrait',
                namespace,
                namespaceScope,
                [],
                {},
                instanceProperties,
                {},
                {},
                valueCoercer,
                instrumentation
            );

            expect(definition.getInstanceProperties()).to.deep.equal(instanceProperties);
        });

        it('should not include instance properties from used traits', function () {
            var result,
                usedTrait = sinon.createStubInstance(Trait);
            usedTrait.getInstanceProperties.returns({
                'usedTraitProp': { value: 'from used trait' }
            });
            definition = new TraitDefinition(
                'MyTrait',
                namespace,
                namespaceScope,
                [usedTrait],
                {},
                { 'myProp': { value: 'my property' } },
                {},
                {},
                valueCoercer,
                instrumentation
            );

            result = definition.getInstanceProperties();

            expect(result).not.to.have.property('usedTraitProp');
        });
    });

    describe('getInstrumentation()', function () {
        it('should return the instrumentation', function () {
            expect(definition.getInstrumentation()).to.equal(instrumentation);
        });
    });

    describe('getMethods()', function () {
        it('should return the trait\'s methods', function () {
            var methods = {
                'myMethod': {
                    args: [],
                    isStatic: false,
                    line: 123,
                    method: function () {}
                }
            };
            definition = new TraitDefinition(
                'MyTrait',
                namespace,
                namespaceScope,
                [],
                {},
                {},
                {},
                methods,
                valueCoercer,
                instrumentation
            );

            expect(definition.getMethods()).to.deep.equal(methods);
        });

        it('should not include methods from used traits', function () {
            var result,
                usedTrait = sinon.createStubInstance(Trait);
            usedTrait.getMethods.returns({
                'usedTraitMethod': {
                    args: [],
                    isStatic: false,
                    line: 123,
                    method: function () {}
                }
            });
            definition = new TraitDefinition(
                'MyTrait',
                namespace,
                namespaceScope,
                [usedTrait],
                {},
                {},
                {},
                { 'myMethod': { args: [], isStatic: false, line: 123, method: function () {} } },
                valueCoercer,
                instrumentation
            );

            result = definition.getMethods();

            expect(result).not.to.have.property('usedTraitMethod');
        });
    });

    describe('getName()', function () {
        it('should return the fully qualified trait name', function () {
            namespace.getPrefix.returns('My\\Namespace\\');

            expect(definition.getName()).to.equal('My\\Namespace\\MyTrait');
        });
    });

    describe('getNamespace()', function () {
        it('should return the namespace', function () {
            expect(definition.getNamespace()).to.equal(namespace);
        });
    });

    describe('getNamespaceScope()', function () {
        it('should return the namespace scope', function () {
            expect(definition.getNamespaceScope()).to.equal(namespaceScope);
        });
    });

    describe('getStaticProperties()', function () {
        it('should return the trait\'s static properties', function () {
            var staticProperties = {
                'myStaticProp': { value: 'static value' }
            };
            definition = new TraitDefinition(
                'MyTrait',
                namespace,
                namespaceScope,
                [],
                {},
                {},
                staticProperties,
                {},
                valueCoercer,
                instrumentation
            );

            expect(definition.getStaticProperties()).to.deep.equal(staticProperties);
        });

        it('should not include static properties from used traits', function () {
            var result,
                usedTrait = sinon.createStubInstance(Trait);
            usedTrait.getStaticProperties.returns({
                'usedTraitStaticProp': { value: 'from used trait' }
            });
            definition = new TraitDefinition(
                'MyTrait',
                namespace,
                namespaceScope,
                [usedTrait],
                {},
                {},
                { 'myStaticProp': { value: 'my static property' } },
                {},
                valueCoercer,
                instrumentation
            );

            result = definition.getStaticProperties();

            expect(result).not.to.have.property('usedTraitStaticProp');
        });
    });

    describe('getTraits()', function () {
        it('should return the traits used by this trait', function () {
            var usedTraits = [
                sinon.createStubInstance(Trait),
                sinon.createStubInstance(Trait)
            ];

            definition = new TraitDefinition(
                'MyTrait',
                namespace,
                namespaceScope,
                usedTraits,
                {},
                {},
                {},
                {},
                valueCoercer,
                instrumentation
            );

            expect(definition.getTraits()).to.deep.equal(usedTraits);
        });
    });

    describe('getValueCoercer()', function () {
        it('should return the value coercer', function () {
            expect(definition.getValueCoercer()).to.equal(valueCoercer);
        });
    });
});
