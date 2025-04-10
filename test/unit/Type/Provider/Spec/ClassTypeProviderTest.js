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
    ClassType = require('../../../../../src/Type/ClassType'),
    ClassTypeProvider = require('../../../../../src/Type/Provider/Spec/ClassTypeProvider'),
    Namespace = require('../../../../../src/Namespace').sync(),
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    TypeFactory = require('../../../../../src/Type/TypeFactory');

describe('ClassTypeProvider', function () {
    var classType,
        namespace,
        namespaceScope,
        provider,
        typeFactory;

    beforeEach(function () {
        classType = sinon.createStubInstance(ClassType);
        namespace = sinon.createStubInstance(Namespace);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        namespace.getPrefix.returns('My\\Absolute\\NamespacePathFor\\');

        namespaceScope.resolveName
            .withArgs('Relative\\NamespacePathFor\\MyClass')
            .returns({
                namespace: namespace,
                name: 'MyClass'
            });

        provider = new ClassTypeProvider(typeFactory);
    });

    describe('createType()', function () {
        it('should be able to create a nullable "class" type', function () {
            // Ensure we resolve the class path relative to the current namespace scope,
            // to account for relative class paths and/or those that depend on `use` imports
            // in the current module.
            typeFactory.createClassType
                .withArgs('My\\Absolute\\NamespacePathFor\\MyClass', true)
                .returns(classType);

            expect(
                provider.createType(
                    {
                        type: 'class',
                        className: 'Relative\\NamespacePathFor\\MyClass'
                    },
                    namespaceScope,
                    true
                )
            ).to.equal(classType);
        });

        it('should be able to create a non-nullable "class" type', function () {
            typeFactory.createClassType
                .withArgs('My\\Absolute\\NamespacePathFor\\MyClass', false)
                .returns(classType);

            expect(
                provider.createType(
                    {
                        type: 'class',
                        className: 'Relative\\NamespacePathFor\\MyClass'
                    },
                    namespaceScope,
                    false
                )
            ).to.equal(classType);
        });
    });
});
