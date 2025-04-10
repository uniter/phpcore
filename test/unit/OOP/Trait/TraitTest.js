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
    tools = require('../../tools'),
    CallStack = require('../../../../src/CallStack'),
    FFIFactory = require('../../../../src/FFI/FFIFactory'),
    Flow = require('../../../../src/Control/Flow'),
    FutureFactory = require('../../../../src/Control/FutureFactory'),
    FunctionFactory = require('../../../../src/FunctionFactory').sync(),
    NamespaceScope = require('../../../../src/NamespaceScope').sync(),
    ReferenceFactory = require('../../../../src/ReferenceFactory').sync(),
    Trait = require('../../../../src/OOP/Trait/Trait'),
    Userland = require('../../../../src/Control/Userland'),
    ValueCoercer = require('../../../../src/FFI/Value/ValueCoercer'),
    ValueFactory = require('../../../../src/ValueFactory').sync();

describe('Trait', function () {
    var callStack,
        ffiFactory,
        flow,
        futureFactory,
        functionFactory,
        namespaceScope,
        referenceFactory,
        state,
        traitObject,
        userland,
        valueCoercer,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        callStack = sinon.createStubInstance(CallStack);
        ffiFactory = sinon.createStubInstance(FFIFactory);
        flow = sinon.createStubInstance(Flow);
        futureFactory = sinon.createStubInstance(FutureFactory);
        functionFactory = sinon.createStubInstance(FunctionFactory);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        userland = sinon.createStubInstance(Userland);
        valueCoercer = sinon.createStubInstance(ValueCoercer);
        valueFactory = sinon.createStubInstance(ValueFactory);

        traitObject = new Trait(
            valueFactory,
            referenceFactory,
            functionFactory,
            callStack,
            flow,
            futureFactory,
            userland,
            'My\\Namespace\\MyTrait',
            [], // Traits used by this one.
            {}, // Constants defined by this trait.
            {}, // Instance properties' data.
            {}, // Static properties' data.
            {}, // Methods defined by this trait.
            namespaceScope,
            valueCoercer,
            ffiFactory,
            null // Instrumentation for this trait.
        );
    });

    describe('getConstants()', function () {
        it('should return the trait\'s constants with the trait object attached', function () {
            var constants = {
                'MY_CONSTANT': { value: 'constant value' }
            };

            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                [],
                constants,
                {},
                {},
                {},
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            expect(traitObject.getConstants()).to.deep.equal({
                'MY_CONSTANT': {
                    value: 'constant value',
                    traitObject: traitObject
                }
            });
        });

        it('should include constants from used traits', function () {
            var usedTrait = sinon.createStubInstance(Trait);
            usedTrait.getConstants.returns({
                'USED_TRAIT_CONSTANT': { value: 'from used trait', traitObject: usedTrait }
            });

            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                [usedTrait],
                { 'MY_CONSTANT': { value: 'my constant' } },
                {},
                {},
                {},
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            expect(traitObject.getConstants()).to.deep.equal({
                'USED_TRAIT_CONSTANT': {
                    value: 'from used trait',
                    traitObject: usedTrait
                },
                'MY_CONSTANT': {
                    value: 'my constant',
                    traitObject: traitObject
                }
            });
        });
    });

    describe('getInstanceProperties()', function () {
        it('should return the trait\'s instance properties with the trait object attached', function () {
            var instanceProperties = {
                'myProp': { value: 'property value' }
            };

            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                [],
                {},
                instanceProperties,
                {},
                {},
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            expect(traitObject.getInstanceProperties()).to.deep.equal({
                'myProp': {
                    value: 'property value',
                    traitObject: traitObject
                }
            });
        });

        it('should include instance properties from used traits', function () {
            var usedTrait = sinon.createStubInstance(Trait);
            usedTrait.getInstanceProperties.returns({
                'usedTraitProp': { value: 'from used trait' }
            });

            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                [usedTrait],
                {},
                { 'myProp': { value: 'my property' } },
                {},
                {},
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            expect(traitObject.getInstanceProperties()).to.deep.equal({
                'usedTraitProp': { value: 'from used trait' },
                'myProp': {
                    value: 'my property',
                    traitObject: traitObject
                }
            });
        });

        it('should handle property conflicts between traits', function () {
            var usedTrait1 = sinon.createStubInstance(Trait),
                usedTrait2 = sinon.createStubInstance(Trait);
            usedTrait1.getInstanceProperties.returns({
                'conflictingProp': { value: 'from trait 1', traitObject: usedTrait1 }
            });
            usedTrait2.getInstanceProperties.returns({
                'conflictingProp': { value: 'from trait 2', traitObject: usedTrait2 }
            });

            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                [usedTrait1, usedTrait2],
                {},
                {},
                {},
                {},
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            expect(traitObject.getInstanceProperties()).to.deep.equal({
                'conflictingProp': {
                    value: 'from trait 2', // Last trait wins.
                    traitObject: usedTrait2
                }
            });
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

            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                [],
                {},
                {},
                {},
                methods,
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            expect(traitObject.getMethods()).to.deep.equal(methods);
        });

        it('should include methods from used traits', function () {
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
            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                [usedTrait],
                {},
                {},
                {},
                { 'myMethod': { args: [], isStatic: false, line: 123, method: function () {} } },
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            result = traitObject.getMethods();

            expect(result).to.have.property('usedTraitMethod');
            expect(result).to.have.property('myMethod');
        });

        it('should handle method conflicts between traits', function () {
            var result,
                usedTrait1 = sinon.createStubInstance(Trait),
                usedTrait2 = sinon.createStubInstance(Trait);
            usedTrait1.getMethods.returns({
                'conflictingMethod': {
                    args: [],
                    isStatic: false,
                    line: 123,
                    method: function () { return 'from trait 1'; }
                }
            });
            usedTrait2.getMethods.returns({
                'conflictingMethod': {
                    args: [],
                    isStatic: false,
                    line: 456,
                    method: function () { return 'from trait 2'; }
                }
            });
            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                [usedTrait1, usedTrait2],
                {},
                {},
                {},
                {},
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            result = traitObject.getMethods();

            expect(result.conflictingMethod.method()).to.equal('from trait 2'); // Last trait wins.
        });
    });

    describe('getName()', function () {
        it('should return the fully qualified trait name', function () {
            expect(traitObject.getName()).to.equal('My\\Namespace\\MyTrait');
        });
    });

    describe('getStaticProperties()', function () {
        it('should return the trait\'s static properties with the trait object attached', function () {
            var staticProperties = {
                'myStaticProp': { value: 'static value' }
            };

            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                [],
                {},
                {},
                staticProperties,
                {},
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            expect(traitObject.getStaticProperties()).to.deep.equal({
                'myStaticProp': {
                    value: 'static value',
                    traitObject: traitObject
                }
            });
        });

        it('should include static properties from used traits', function () {
            var usedTrait = sinon.createStubInstance(Trait);
            usedTrait.getStaticProperties.returns({
                'usedTraitStaticProp': { value: 'from used trait' }
            });

            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                [usedTrait],
                {},
                {},
                { 'myStaticProp': { value: 'my static property' } },
                {},
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            expect(traitObject.getStaticProperties()).to.deep.equal({
                'usedTraitStaticProp': { value: 'from used trait' },
                'myStaticProp': {
                    value: 'my static property',
                    traitObject: traitObject
                }
            });
        });

        it('should handle static property conflicts between traits', function () {
            var usedTrait1 = sinon.createStubInstance(Trait),
                usedTrait2 = sinon.createStubInstance(Trait);
            usedTrait1.getStaticProperties.returns({
                'conflictingStaticProp': { value: 'from trait 1', traitObject: usedTrait1 }
            });
            usedTrait2.getStaticProperties.returns({
                'conflictingStaticProp': { value: 'from trait 2', traitObject: usedTrait2 }
            });

            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                [usedTrait1, usedTrait2],
                {},
                {},
                {},
                {},
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            expect(traitObject.getStaticProperties()).to.deep.equal({
                'conflictingStaticProp': {
                    value: 'from trait 2', // Last trait wins.
                    traitObject: usedTrait2
                }
            });
        });
    });

    describe('getUnprefixedName()', function () {
        it('should return the trait name without namespace prefix', function () {
            expect(traitObject.getUnprefixedName()).to.equal('MyTrait');
        });
    });

    describe('getTraits()', function () {
        it('should return the traits used by this trait', function () {
            var usedTraits = [
                sinon.createStubInstance(Trait),
                sinon.createStubInstance(Trait)
            ];

            traitObject = new Trait(
                valueFactory,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Namespace\\MyTrait',
                usedTraits,
                {},
                {},
                {},
                {},
                namespaceScope,
                valueCoercer,
                ffiFactory,
                null
            );

            expect(traitObject.getTraits()).to.deep.equal(usedTraits);
        });
    });
});
