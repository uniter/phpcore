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
    tools = require('./tools'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    Module = require('../../src/Module'),
    Namespace = require('../../src/Namespace').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync();

describe('NamespaceScope', function () {
    var callStack,
        futureFactory,
        globalNamespace,
        module,
        namespace,
        scope,
        scopeFactory,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        callStack = sinon.createStubInstance(CallStack);
        futureFactory = state.getFutureFactory();
        globalNamespace = sinon.createStubInstance(Namespace);
        module = sinon.createStubInstance(Module);
        namespace = sinon.createStubInstance(Namespace);
        valueFactory = state.getValueFactory();

        callStack.raiseUncatchableFatalError.callsFake(function (translationKey, placeholderVariables) {
            throw new Error('PHP Fatal error: [' + translationKey + '] ' + JSON.stringify(placeholderVariables || {}));
        });
        globalNamespace.hasClass.returns(false);
        module.isStrictTypesMode.returns(false);

        scope = new NamespaceScope(
            scopeFactory,
            globalNamespace,
            valueFactory,
            callStack,
            module,
            namespace,
            false
        );
    });

    describe('defineFunction()', function () {
        it('should define the function on the Namespace', function () {
            var myFunc = sinon.stub(),
                parametersSpecData = [{name: 'param1'}, {name: 'param2'}],
                returnTypeSpec = {type: 'iterable'};

            scope.defineFunction(
                'myFunc',
                myFunc,
                parametersSpecData,
                returnTypeSpec,
                1234
            );

            expect(namespace.defineFunction).to.have.been.calledOnce;
            expect(namespace.defineFunction).to.have.been.calledWith(
                'myFunc',
                sinon.match.same(myFunc),
                sinon.match.same(scope),
                parametersSpecData,
                returnTypeSpec,
                false, // TODO: Implement userland return-by-reference.
                1234
            );
        });
    });

    describe('enableStrictTypes()', function () {
        it('should enable strict-types mode for the module', function () {
            scope.enableStrictTypes();

            expect(module.enableStrictTypes).to.have.been.calledOnce;
        });
    });

    describe('getClass()', function () {
        it('should support fetching a class with no imports involved', async function () {
            var myClass = sinon.createStubInstance(Class);
            namespace.getClass
                .withArgs('MyClass')
                .returns(futureFactory.createPresent(myClass));

            expect(await scope.getClass('MyClass').toPromise()).to.equal(myClass);
        });

        it('should support fetching a class with whole name aliased case-insensitively', async function () {
            var myClass = sinon.createStubInstance(Class);
            globalNamespace.getClass
                .withArgs('MyClass')
                .returns(futureFactory.createPresent(myClass));
            scope.use('MyClass', 'AnAliasForMyClass');

            expect(await scope.getClass('analiasFORMYClAsS').toPromise()).to.equal(myClass);
        });

        it('should support fetching a relative class path with prefix aliased case-insensitively', async function () {
            var myClass = sinon.createStubInstance(Class),
                subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant
                .withArgs('The\\Namespace\\Of\\My')
                .returns(subNamespace);
            subNamespace.getClass.withArgs('PhpClass')
                .returns(futureFactory.createPresent(myClass));
            scope.use('The\\Namespace\\Of', 'TheAliasOfIt');

            expect(await scope.getClass('thealIASOFit\\My\\PhpClass').toPromise()).to.equal(myClass);
        });

        it('should support fetching an absolute class path', async function () {
            var myClass = sinon.createStubInstance(Class),
                subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant
                .withArgs('The\\Absolute\\Path\\To\\My')
                .returns(subNamespace);
            subNamespace.getClass
                .withArgs('PhpClass')
                .returns(futureFactory.createPresent(myClass));
            scope.use('I\\Should\\Be\\Ignored', 'The');

            expect(await scope.getClass('\\The\\Absolute\\Path\\To\\My\\PhpClass').toPromise()).to.equal(myClass);
        });

        it('should support fetching an absolute path to a class in the global namespace', async function () {
            var myClass = sinon.createStubInstance(Class);
            globalNamespace.getClass
                .withArgs('MyClass')
                .returns(futureFactory.createPresent(myClass));

            expect(await scope.getClass('\\MyClass').toPromise()).to.equal(myClass);
        });
    });

    describe('getConstant()', function () {
        it('should support fetching a constant with no imports involved', function () {
            var myConstant = valueFactory.createString('The value of my constant');
            namespace.getConstant.withArgs('MY_CONSTANT', false).returns(myConstant);

            expect(scope.getConstant('MY_CONSTANT')).to.equal(myConstant);
        });

        it('should support fetching a relative constant path with prefix aliased case-insensitively', function () {
            var myConstant = valueFactory.createString('a value'),
                subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant.withArgs('The\\Namespace\\Of\\My').returns(subNamespace);
            subNamespace.getConstant.withArgs('MY_CONS', true).returns(myConstant);
            scope.use('The\\Namespace\\Of', 'TheAliasOfIt');

            expect(scope.getConstant('thealIASOFit\\My\\MY_CONS')).to.equal(myConstant);
        });

        it('should support fetching a relative constant path within the current namespace case-insensitively', function () {
            var myConstant = valueFactory.createString('a value'),
                subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant.withArgs('My\\Current\\Namespace\\Relative\\Path\\To').returns(subNamespace);
            subNamespace.getConstant.withArgs('MY_CONS', true).returns(myConstant);
            namespace.getPrefix.returns('My\\Current\\Namespace\\');

            expect(scope.getConstant('Relative\\Path\\To\\MY_CONS')).to.equal(myConstant);
        });

        it('should support fetching an absolute constant path', function () {
            var myConstant = valueFactory.createString('the value of my constant'),
                subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant.withArgs('The\\Absolute\\Path\\To\\My').returns(subNamespace);
            subNamespace.getConstant.withArgs('THE_CONSTANT', true).returns(myConstant);
            scope.use('I\\Should\\Be\\Ignored', 'The');

            expect(scope.getConstant('\\The\\Absolute\\Path\\To\\My\\THE_CONSTANT')).to.equal(myConstant);
        });
    });

    describe('getFunction()', function () {
        it('should support fetching a function with no imports involved', function () {
            var myFunction = sinon.stub();
            namespace.getFunction.withArgs('myFunction').returns(myFunction);

            expect(scope.getFunction('myFunction')).to.equal(myFunction);
        });

        it('should support fetching a relative function path with prefix aliased case-insensitively', function () {
            var myFunction = sinon.stub(),
                subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant.withArgs('The\\Namespace\\Of\\My').returns(subNamespace);
            subNamespace.getFunction.withArgs('myFunction').returns(myFunction);
            scope.use('The\\Namespace\\Of', 'TheAliasOfIt');

            expect(scope.getFunction('thealIASOFit\\My\\myFunction')).to.equal(myFunction);
        });

        it('should support fetching a relative function path within the current namespace case-insensitively', function () {
            var myFunction = sinon.stub(),
                subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant.withArgs('My\\Current\\Namespace\\Relative\\Path\\To').returns(subNamespace);
            subNamespace.getFunction.withArgs('myFunction').returns(myFunction);
            namespace.getPrefix.returns('My\\Current\\Namespace\\');

            expect(scope.getFunction('Relative\\Path\\To\\myFunction')).to.equal(myFunction);
        });

        it('should support fetching an absolute function path', function () {
            var myFunction = sinon.stub(),
                subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant.withArgs('The\\Absolute\\Path\\To\\My').returns(subNamespace);
            subNamespace.getFunction.withArgs('myAbsoluteFunction').returns(myFunction);
            scope.use('I\\Should\\Be\\Ignored', 'The');

            expect(scope.getFunction('\\The\\Absolute\\Path\\To\\My\\myAbsoluteFunction')).to.equal(myFunction);
        });
    });

    describe('getFilePath()', function () {
        it('should return the file path from the module', function () {
            module.getFilePath.returns('/my/module.php');

            expect(scope.getFilePath()).to.equal('/my/module.php');
        });
    });

    describe('getNamespace()', function () {
        it('should return the namespace the scope is in', function () {
            expect(scope.getNamespace()).to.equal(namespace);
        });
    });

    describe('getNamespaceName()', function () {
        it('should return the name of the namespace', function () {
            namespace.getName.returns('My\\Namespace');

            expect(scope.getNamespaceName().getNative()).to.equal('My\\Namespace');
        });
    });

    describe('getNamespacePrefix()', function () {
        it('should return the prefix string from the namespace', function () {
            namespace.getPrefix.returns('My\\Name\\Space');

            expect(scope.getNamespacePrefix()).to.equal('My\\Name\\Space');
        });
    });

    describe('hasClass()', function () {
        it('should return true when the given path has already been aliased', function () {
            scope.use('My\\App\\Stuff', 'MyStuff');

            expect(scope.hasClass('MyStuff')).to.be.true;
        });

        it('should return true when the given path is absolute and references a class defined in the global namespace', function () {
            globalNamespace.hasClass
                .withArgs('MyClass')
                .returns(true);

            expect(scope.hasClass('\\MyClass')).to.be.true;
        });

        it('should return true when the given path is absolute and references a class defined in a sub-namespace of the global one', function () {
            var subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant
                .withArgs('Some\\Sub')
                .returns(subNamespace);
            subNamespace.hasClass
                .withArgs('MyClass')
                .returns(true);

            expect(scope.hasClass('\\Some\\Sub\\MyClass')).to.be.true;
        });

        it('should return true when the given path is relative and references a class defined in a sub-namespace of this one', function () {
            var subNamespace = sinon.createStubInstance(Namespace);
            namespace.getDescendant
                .withArgs('Some\\Sub')
                .returns(subNamespace);
            subNamespace.hasClass
                .withArgs('MyClass')
                .returns(true);

            expect(scope.hasClass('Some\\Sub\\MyClass')).to.be.true;
        });

        it('should return true when the given path is relative and references a class defined in a sub-namespace of this one via an alias', function () {
            var subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant
                .withArgs('Some\\Sub')
                .returns(subNamespace);
            subNamespace.hasClass
                .withArgs('MyClass')
                .returns(true);
            scope.use('Some', 'IndirectlySome');

            expect(scope.hasClass('IndirectlySome\\Sub\\MyClass')).to.be.true;
        });

        it('should return false when the given class is not defined', function () {
            expect(scope.hasClass('\\SomeUndefinedClass')).to.be.false;
        });
    });

    describe('isGlobal()', function () {
        it('should return true when this is the special invisible global NamespaceScope', function () {
            var scope = new NamespaceScope(
                scopeFactory,
                globalNamespace,
                valueFactory,
                callStack,
                module,
                namespace,
                true
            );

            expect(scope.isGlobal()).to.be.true;
        });

        it('should return false for a normal NamespaceScope', function () {
            expect(scope.isGlobal()).to.be.false;
        });
    });

    describe('isStrictTypesMode()', function () {
        it('should return true when the module is in strict-types mode', function () {
            module.isStrictTypesMode.returns(true);

            expect(scope.isStrictTypesMode()).to.be.true;
        });

        it('should return false when the module is in weak type-checking mode', function () {
            expect(scope.isStrictTypesMode()).to.be.false;
        });
    });

    describe('resolveClass()', function () {
        it('should support resolving a class with no imports involved', function () {
            var result = scope.resolveClass('MyClass');

            expect(result.namespace).to.equal(namespace);
            expect(result.name).to.equal('MyClass');
        });

        it('should support resolving a class with whole name aliased case-insensitively', function () {
            var result;
            scope.use('MyClass', 'AnAliasForMyClass');

            result = scope.resolveClass('analiasFORMYClAsS');

            expect(result.namespace).to.equal(globalNamespace);
            expect(result.name).to.equal('MyClass');
        });

        it('should support resolving a relative class path with prefix aliased case-insensitively', function () {
            var result,
                subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant.withArgs('The\\Namespace\\Of\\My').returns(subNamespace);
            scope.use('The\\Namespace\\Of', 'TheAliasOfIt');

            result = scope.resolveClass('thealIASOFit\\My\\PhpClass');

            expect(result.namespace).to.equal(subNamespace);
            expect(result.name).to.equal('PhpClass');
        });

        it('should support resolving a relative path to a class defined in a sub-namespace of this one', function () {
            var result,
                subNamespace = sinon.createStubInstance(Namespace);
            namespace.getDescendant
                .withArgs('Some\\Sub')
                .returns(subNamespace);

            result = scope.resolveClass('Some\\Sub\\MyClass');

            expect(result.namespace).to.equal(subNamespace);
            expect(result.name).to.equal('MyClass');
        });

        it('should support resolving an absolute class path', function () {
            var result,
                subNamespace = sinon.createStubInstance(Namespace);
            globalNamespace.getDescendant.withArgs('The\\Absolute\\Path\\To\\My').returns(subNamespace);
            scope.use('I\\Should\\Be\\Ignored', 'The');

            result = scope.resolveClass('\\The\\Absolute\\Path\\To\\My\\AbsPhpClass');

            expect(result.namespace).to.equal(subNamespace);
            expect(result.name).to.equal('AbsPhpClass');
        });

        it('should support resolving an absolute path to a class in the global namespace', function () {
            var result = scope.resolveClass('\\MyClass');

            expect(result.namespace).to.equal(globalNamespace);
            expect(result.name).to.equal('MyClass');
        });

        it('should support resolving a path prefixed with the special namespace keyword to the current namespace only, ignoring any "use" imports', function () {
            var result,
                subNamespace = sinon.createStubInstance(Namespace);
            namespace.getDescendant.withArgs('Stuff\\Here').returns(subNamespace);
            scope.use('Some\\Other\\StuffNamespace', 'Stuff');

            result = scope.resolveClass('namespace\\Stuff\\Here\\MyClass');

            expect(result.namespace).to.equal(subNamespace);
            expect(result.name).to.equal('MyClass');
        });

        it('should support resolving a path prefixed with the special namespace keyword using mixed case to the current namespace only, ignoring any "use" imports', function () {
            var result,
                subNamespace = sinon.createStubInstance(Namespace);
            namespace.getDescendant.withArgs('Stuff\\Here').returns(subNamespace);
            scope.use('Some\\Other\\StuffNamespace', 'Stuff');

            result = scope.resolveClass('naMESPaCe\\Stuff\\Here\\MyClass');

            expect(result.namespace).to.equal(subNamespace);
            expect(result.name).to.equal('MyClass');
        });
    });

    describe('use()', function () {
        it('should recognise duplicate aliases case-insensitively', function () {
            scope.use('My\\App\\Stuff', 'MyStuff');

            expect(function () {
                scope.use('My\\App\\Stuff', 'mYSTuff');
            }).to.throw(
                'PHP Fatal error: [core.cannot_use_as_name_already_in_use] {"alias":"mYSTuff","source":"My\\\\App\\\\Stuff"}'
            );
        });
    });
});
