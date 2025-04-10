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
    CallInstrumentation = require('../../../../src/Instrumentation/CallInstrumentation'),
    InstrumentationFactory = require('../../../../src/Instrumentation/InstrumentationFactory'),
    NamespaceScope = require('../../../../src/NamespaceScope').sync(),
    Trait = require('../../../../src/OOP/Trait/Trait'),
    TraitDefinition = require('../../../../src/OOP/Trait/Definition/TraitDefinition'),
    TraitFactory = require('../../../../src/OOP/Trait/TraitFactory'),
    TraitPromoter = require('../../../../src/OOP/Trait/TraitPromoter');

describe('TraitPromoter', function () {
    var instrumentation,
        instrumentationFactory,
        namespaceScope,
        promoter,
        traitDefinition,
        traitFactory;

    beforeEach(function () {
        instrumentation = sinon.createStubInstance(CallInstrumentation);
        instrumentationFactory = sinon.createStubInstance(InstrumentationFactory);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        traitFactory = sinon.createStubInstance(TraitFactory);
        traitDefinition = sinon.createStubInstance(TraitDefinition);

        promoter = new TraitPromoter(
            traitFactory,
            instrumentationFactory
        );
    });

    describe('promoteDefinition()', function () {
        var traitObject;

        beforeEach(function () {
            traitObject = sinon.createStubInstance(Trait);

            traitDefinition.getName.returns('MyTrait');
            traitDefinition.getNamespace.returns({ getPrefix: () => 'My\\Namespace\\' });
            traitDefinition.getNamespaceScope.returns(namespaceScope);
            traitDefinition.getTraits.returns([]);
            traitDefinition.getConstants.returns({});
            traitDefinition.getInstanceProperties.returns({});
            traitDefinition.getStaticProperties.returns({});
            traitDefinition.getMethods.returns({});
            traitDefinition.getValueCoercer.returns({});
            traitDefinition.getInstrumentation.returns(null);

            instrumentationFactory.createCallInstrumentation.returns(instrumentation);
            traitFactory.createTrait.returns(traitObject);
        });

        it('should create instrumentation for the trait when none is provided by the definition', function () {
            promoter.promoteDefinition(traitDefinition);

            expect(instrumentationFactory.createCallInstrumentation).to.have.been.calledWith(
                null
            );
        });

        it('should not create instrumentation when it is provided by the definition', function () {
            traitDefinition.getInstrumentation.returns(instrumentation);

            promoter.promoteDefinition(traitDefinition);

            expect(instrumentationFactory.createCallInstrumentation).not.to.have.been.called;
        });

        it('should create a trait using the factory with all the definition data', function () {
            promoter.promoteDefinition(traitDefinition);

            expect(traitFactory.createTrait).to.have.been.calledWith(
                'MyTrait',
                sinon.match.same(traitDefinition.getNamespace()),
                sinon.match.same(traitDefinition.getNamespaceScope()),
                sinon.match.same(traitDefinition.getTraits()),
                sinon.match.same(traitDefinition.getConstants()),
                sinon.match.same(traitDefinition.getInstanceProperties()),
                sinon.match.same(traitDefinition.getStaticProperties()),
                sinon.match.same(traitDefinition.getMethods()),
                sinon.match.same(traitDefinition.getValueCoercer()),
                sinon.match.same(instrumentation)
            );
        });

        it('should return the created trait', function () {
            expect(promoter.promoteDefinition(traitDefinition)).to.equal(traitObject);
        });

        it('should handle trait composition when promoting', function () {
            var usedTrait = sinon.createStubInstance(Trait);
            traitDefinition.getTraits.returns([usedTrait]);

            promoter.promoteDefinition(traitDefinition);

            expect(traitFactory.createTrait).to.have.been.calledWith(
                'MyTrait',
                sinon.match.same(traitDefinition.getNamespace()),
                sinon.match.same(traitDefinition.getNamespaceScope()),
                sinon.match([sinon.match.same(usedTrait)]),
                sinon.match.same(traitDefinition.getConstants()),
                sinon.match.same(traitDefinition.getInstanceProperties()),
                sinon.match.same(traitDefinition.getStaticProperties()),
                sinon.match.same(traitDefinition.getMethods()),
                sinon.match.same(traitDefinition.getValueCoercer()),
                sinon.match.same(instrumentation)
            );
        });
    });
});
