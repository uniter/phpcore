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
    Environment = require('../../../src/Environment'),
    Exception = phpCommon.Exception,
    Module = require('../../../src/Module'),
    NamespaceContext = require('../../../src/Namespace/NamespaceContext'),
    NamespaceScope = require('../../../src/NamespaceScope').sync();

describe('NamespaceContext', function () {
    var context,
        environment,
        namespaceScope;

    beforeEach(function () {
        environment = sinon.createStubInstance(Environment);
        namespaceScope = sinon.createStubInstance(NamespaceScope);

        context = new NamespaceContext(environment);
    });

    describe('enterNamespaceScope()', function () {
        it('should be able to enter a nested NamespaceScope', function () {
            var nestedNamespaceScope = sinon.createStubInstance(NamespaceScope);
            context.enterNamespaceScope(namespaceScope);

            context.enterNamespaceScope(nestedNamespaceScope);

            expect(context.getEffectiveNamespaceScope()).to.equal(nestedNamespaceScope);
        });
    });

    describe('getEffectiveNamespaceScope()', function () {
        it('should return the effective NamespaceScope when one was entered', function () {
            context.enterNamespaceScope(namespaceScope);

            expect(context.getEffectiveNamespaceScope()).to.equal(namespaceScope);
        });
    });

    describe('getEnteredNamespaceScope()', function () {
        it('should return the entered NamespaceScope when one was entered', function () {
            context.enterNamespaceScope(namespaceScope);

            expect(context.getEnteredNamespaceScope()).to.equal(namespaceScope);
        });
    });

    describe('getEnvironment()', function () {
        it('should return the Environment', function () {
            expect(context.getEnvironment()).to.equal(environment);
        });
    });

    describe('getNamespaceScopeStackDepth()', function () {
        it('should return 0 when there is no current NamespaceScope', function () {
            expect(context.getNamespaceScopeStackDepth()).to.equal(0);
        });

        it('should return 1 when there is a current NamespaceScope', function () {
            context.enterNamespaceScope(namespaceScope);

            expect(context.getNamespaceScopeStackDepth()).to.equal(1);
        });

        it('should return 2 when a nested NamespaceScope has been entered', function () {
            var nestedNamespaceScope = sinon.createStubInstance(NamespaceScope);
            context.enterNamespaceScope(namespaceScope);
            context.enterNamespaceScope(nestedNamespaceScope);

            expect(context.getNamespaceScopeStackDepth()).to.equal(2);
        });
    });

    describe('getNormalisedPath()', function () {
        it('should return the path from the effective NamespaceScope when it has one', function () {
            namespaceScope.getFilePath.returns('/path/to/my_module.php');
            context.enterNamespaceScope(namespaceScope);

            expect(context.getNormalisedPath()).to.equal('/path/to/my_module.php');
        });

        it('should return "(program)" when the effective NamespaceScope has no path set', function () {
            namespaceScope.getFilePath.returns(null);
            context.enterNamespaceScope(namespaceScope);

            expect(context.getNormalisedPath()).to.equal('(program)');
        });
    });

    describe('leaveNamespaceScope()', function () {
        it('should be able to leave a nested NamespaceScope', function () {
            var nestedNamespaceScope = sinon.createStubInstance(NamespaceScope);
            context.enterNamespaceScope(namespaceScope);
            context.enterNamespaceScope(nestedNamespaceScope);

            context.leaveNamespaceScope(nestedNamespaceScope);

            expect(context.getEffectiveNamespaceScope()).to.equal(namespaceScope);
        });

        it('should throw when the given NamespaceScope is the previous one', function () {
            var nestedNamespaceScope = sinon.createStubInstance(NamespaceScope);
            context.enterNamespaceScope(namespaceScope);
            context.enterNamespaceScope(nestedNamespaceScope);

            expect(function () {
                context.leaveNamespaceScope(namespaceScope);
            }).to.throw(
                Exception,
                'leaveNamespaceScope() :: Incorrect NamespaceScope provided'
            );
        });

        it('should throw when there is no previous NamespaceScope', function () {
            expect(function () {
                context.leaveNamespaceScope(namespaceScope);
            }).to.throw(
                Exception,
                'leaveNamespaceScope() :: NamespaceScope stack is empty'
            );
        });
    });

    describe('restore()', function () {
        var effectiveNamespaceScope,
            previousEffectiveNamespaceScope,
            previousEnteredNamespaceScope,
            previousState;

        beforeEach(function () {
            effectiveNamespaceScope = sinon.createStubInstance(NamespaceScope);
            previousEffectiveNamespaceScope = sinon.createStubInstance(NamespaceScope);
            previousEnteredNamespaceScope = sinon.createStubInstance(NamespaceScope);

            previousState = {
                enteredNamespaceScope: namespaceScope,
                effectiveNamespaceScope: effectiveNamespaceScope,
                namespaceScopeStack: [
                    {
                        enteredNamespaceScope: previousEnteredNamespaceScope,
                        effectiveNamespaceScope: previousEffectiveNamespaceScope
                    }
                ]
            };
        });

        it('should restore the entered NamespaceScope', function () {
            context.restore(previousState);

            expect(context.getEnteredNamespaceScope()).to.equal(namespaceScope);
        });

        it('should restore any effective descendant NamespaceScope', function () {
            context.restore(previousState);

            expect(context.getEffectiveNamespaceScope()).to.equal(effectiveNamespaceScope);
        });

        it('should restore the NamespaceScope stack', function () {
            context.restore(previousState);
            context.leaveNamespaceScope(namespaceScope);

            expect(context.getEnteredNamespaceScope()).to.equal(previousEnteredNamespaceScope);
            expect(context.getEffectiveNamespaceScope()).to.equal(previousEffectiveNamespaceScope);
        });
    });

    describe('save()', function () {
        var effectiveNamespaceScope,
            previousEffectiveNamespaceScope,
            previousEnteredNamespaceScope,
            previousState;

        beforeEach(function () {
            effectiveNamespaceScope = sinon.createStubInstance(NamespaceScope);
            previousEffectiveNamespaceScope = sinon.createStubInstance(NamespaceScope);
            previousEnteredNamespaceScope = sinon.createStubInstance(NamespaceScope);

            previousState = {
                enteredNamespaceScope: namespaceScope,
                effectiveNamespaceScope: effectiveNamespaceScope,
                namespaceScopeStack: [
                    {
                        enteredNamespaceScope: previousEnteredNamespaceScope,
                        effectiveNamespaceScope: previousEffectiveNamespaceScope
                    }
                ]
            };
        });

        it('should return an object with the entered NamespaceScope', function () {
            var state;
            context.restore(previousState);

            state = context.save();

            expect(state.enteredNamespaceScope).to.equal(namespaceScope);
        });

        it('should return an object with the effective NamespaceScope', function () {
            var state;
            context.restore(previousState);

            state = context.save();

            expect(state.effectiveNamespaceScope).to.equal(effectiveNamespaceScope);
        });

        it('should return an object with the current NamespaceScope stack', function () {
            var state;
            context.restore(previousState);

            state = context.save();

            expect(state.namespaceScopeStack).to.have.length(1);
            expect(state.namespaceScopeStack[0].enteredNamespaceScope).to.equal(previousEnteredNamespaceScope);
            expect(state.namespaceScopeStack[0].effectiveNamespaceScope).to.equal(previousEffectiveNamespaceScope);
        });

        it('should clear the record of the entered NamespaceScope', function () {
            context.restore(previousState);

            context.save();

            expect(context.getEnteredNamespaceScope()).to.be.null;
        });

        it('should clear the record of the effective NamespaceScope', function () {
            context.restore(previousState);

            context.save();

            expect(context.getEffectiveNamespaceScope()).to.be.null;
        });

        it('should clear the current NamespaceScope stack', function () {
            context.restore(previousState);

            context.save();

            expect(context.getNamespaceScopeStackDepth()).to.equal(0);
        });
    });

    describe('useDescendantNamespaceScope()', function () {
        it('should enter the descendant NamespaceScope of the currently entered one', function () {
            var descendantNamespaceScope = sinon.createStubInstance(NamespaceScope),
                module = sinon.createStubInstance(Module),
                topLevelNamespaceScope = sinon.createStubInstance(NamespaceScope);
            namespaceScope.getModule.returns(module);
            module.getTopLevelNamespaceScope.returns(topLevelNamespaceScope);
            topLevelNamespaceScope.getDescendant
                .withArgs('MyDescendant')
                .returns(descendantNamespaceScope);
            context.enterNamespaceScope(namespaceScope);

            expect(context.useDescendantNamespaceScope('MyDescendant')).to.equal(
                descendantNamespaceScope,
                'Entered NamespaceScope should be returned'
            );
            expect(context.getEffectiveNamespaceScope()).to.equal(descendantNamespaceScope);
            expect(context.getEnteredNamespaceScope()).to.equal(
                namespaceScope,
                'Entered NamespaceScope should remain unchanged'
            );
        });
    });

    describe('useGlobalNamespaceScope()', function () {
        it('should enter the top-level NamespaceScope for the currently entered one\'s module', function () {
            var module = sinon.createStubInstance(Module),
                topLevelNamespaceScope = sinon.createStubInstance(NamespaceScope);
            namespaceScope.getModule.returns(module);
            module.getTopLevelNamespaceScope.returns(topLevelNamespaceScope);
            context.enterNamespaceScope(namespaceScope);

            expect(context.useGlobalNamespaceScope()).to.equal(
                topLevelNamespaceScope,
                'Top-level NamespaceScope of module should be returned'
            );
            expect(context.getEffectiveNamespaceScope()).to.equal(topLevelNamespaceScope);
            expect(context.getEnteredNamespaceScope()).to.equal(
                namespaceScope,
                'Entered NamespaceScope should remain unchanged'
            );
        });
    });
});
