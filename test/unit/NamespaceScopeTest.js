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
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    Module = require('../../src/Module'),
    Namespace = require('../../src/Namespace').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('NamespaceScope', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.module = sinon.createStubInstance(Module);
        this.namespace = sinon.createStubInstance(Namespace);
        this.valueFactory = new ValueFactory();

        this.callStack.raiseUncatchableFatalError.callsFake(function (translationKey, placeholderVariables) {
            throw new Error('PHP Fatal error: [' + translationKey + '] ' + JSON.stringify(placeholderVariables || {}));
        });
        this.globalNamespace.hasClass.returns(false);

        this.scope = new NamespaceScope(
            this.globalNamespace,
            this.valueFactory,
            this.callStack,
            this.module,
            this.namespace,
            false
        );
    });

    describe('getClass()', function () {
        it('should support fetching a class with no imports involved', function () {
            var myClass = sinon.createStubInstance(Class);
            this.namespace.getClass.withArgs('MyClass').returns(myClass);

            expect(this.scope.getClass('MyClass')).to.equal(myClass);
        });

        it('should support fetching a class with whole name aliased case-insensitively', function () {
            var myClass = sinon.createStubInstance(Class);
            this.globalNamespace.getClass.withArgs('MyClass').returns(myClass);
            this.scope.use('MyClass', 'AnAliasForMyClass');

            expect(this.scope.getClass('analiasFORMYClAsS')).to.equal(myClass);
        });

        it('should support fetching a relative class path with prefix aliased case-insensitively', function () {
            var myClass = sinon.createStubInstance(Class),
                subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant.withArgs('The\\Namespace\\Of\\My').returns(subNamespace);
            subNamespace.getClass.withArgs('PhpClass').returns(myClass);
            this.scope.use('The\\Namespace\\Of', 'TheAliasOfIt');

            expect(this.scope.getClass('thealIASOFit\\My\\PhpClass')).to.equal(myClass);
        });

        it('should support fetching an absolute class path', function () {
            var myClass = sinon.createStubInstance(Class),
                subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant.withArgs('The\\Absolute\\Path\\To\\My').returns(subNamespace);
            subNamespace.getClass.withArgs('PhpClass').returns(myClass);
            this.scope.use('I\\Should\\Be\\Ignored', 'The');

            expect(this.scope.getClass('\\The\\Absolute\\Path\\To\\My\\PhpClass')).to.equal(myClass);
        });

        it('should support fetching an absolute path to a class in the global namespace', function () {
            var myClass = sinon.createStubInstance(Class);
            this.globalNamespace.getClass.withArgs('MyClass').returns(myClass);

            expect(this.scope.getClass('\\MyClass')).to.equal(myClass);
        });
    });

    describe('getConstant()', function () {
        it('should support fetching a constant with no imports involved', function () {
            var myConstant = this.valueFactory.createString('The value of my constant');
            this.namespace.getConstant.withArgs('MY_CONSTANT', false).returns(myConstant);

            expect(this.scope.getConstant('MY_CONSTANT')).to.equal(myConstant);
        });

        it('should support fetching a relative constant path with prefix aliased case-insensitively', function () {
            var myConstant = this.valueFactory.createString('a value'),
                subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant.withArgs('The\\Namespace\\Of\\My').returns(subNamespace);
            subNamespace.getConstant.withArgs('MY_CONS', true).returns(myConstant);
            this.scope.use('The\\Namespace\\Of', 'TheAliasOfIt');

            expect(this.scope.getConstant('thealIASOFit\\My\\MY_CONS')).to.equal(myConstant);
        });

        it('should support fetching a relative constant path within the current namespace case-insensitively', function () {
            var myConstant = this.valueFactory.createString('a value'),
                subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant.withArgs('My\\Current\\Namespace\\Relative\\Path\\To').returns(subNamespace);
            subNamespace.getConstant.withArgs('MY_CONS', true).returns(myConstant);
            this.namespace.getPrefix.returns('My\\Current\\Namespace\\');

            expect(this.scope.getConstant('Relative\\Path\\To\\MY_CONS')).to.equal(myConstant);
        });

        it('should support fetching an absolute constant path', function () {
            var myConstant = this.valueFactory.createString('the value of my constant'),
                subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant.withArgs('The\\Absolute\\Path\\To\\My').returns(subNamespace);
            subNamespace.getConstant.withArgs('THE_CONSTANT', true).returns(myConstant);
            this.scope.use('I\\Should\\Be\\Ignored', 'The');

            expect(this.scope.getConstant('\\The\\Absolute\\Path\\To\\My\\THE_CONSTANT')).to.equal(myConstant);
        });
    });

    describe('getFunction()', function () {
        it('should support fetching a function with no imports involved', function () {
            var myFunction = sinon.stub();
            this.namespace.getFunction.withArgs('myFunction').returns(myFunction);

            expect(this.scope.getFunction('myFunction')).to.equal(myFunction);
        });

        it('should support fetching a relative function path with prefix aliased case-insensitively', function () {
            var myFunction = sinon.stub(),
                subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant.withArgs('The\\Namespace\\Of\\My').returns(subNamespace);
            subNamespace.getFunction.withArgs('myFunction').returns(myFunction);
            this.scope.use('The\\Namespace\\Of', 'TheAliasOfIt');

            expect(this.scope.getFunction('thealIASOFit\\My\\myFunction')).to.equal(myFunction);
        });

        it('should support fetching a relative function path within the current namespace case-insensitively', function () {
            var myFunction = sinon.stub(),
                subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant.withArgs('My\\Current\\Namespace\\Relative\\Path\\To').returns(subNamespace);
            subNamespace.getFunction.withArgs('myFunction').returns(myFunction);
            this.namespace.getPrefix.returns('My\\Current\\Namespace\\');

            expect(this.scope.getFunction('Relative\\Path\\To\\myFunction')).to.equal(myFunction);
        });

        it('should support fetching an absolute function path', function () {
            var myFunction = sinon.stub(),
                subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant.withArgs('The\\Absolute\\Path\\To\\My').returns(subNamespace);
            subNamespace.getFunction.withArgs('myAbsoluteFunction').returns(myFunction);
            this.scope.use('I\\Should\\Be\\Ignored', 'The');

            expect(this.scope.getFunction('\\The\\Absolute\\Path\\To\\My\\myAbsoluteFunction')).to.equal(myFunction);
        });
    });

    describe('getFilePath()', function () {
        it('should return the file path from the module', function () {
            this.module.getFilePath.returns('/my/module.php');

            expect(this.scope.getFilePath()).to.equal('/my/module.php');
        });
    });

    describe('getNamespaceName()', function () {
        it('should return the name of the namespace', function () {
            this.namespace.getName.returns('My\\Namespace');

            expect(this.scope.getNamespaceName().getNative()).to.equal('My\\Namespace');
        });
    });

    describe('getNamespacePrefix()', function () {
        it('should return the prefix string from the namespace', function () {
            this.namespace.getPrefix.returns('My\\Name\\Space');

            expect(this.scope.getNamespacePrefix()).to.equal('My\\Name\\Space');
        });
    });

    describe('hasClass()', function () {
        it('should return true when the given path has already been aliased', function () {
            this.scope.use('My\\App\\Stuff', 'MyStuff');

            expect(this.scope.hasClass('MyStuff')).to.be.true;
        });

        it('should return true when the given path is absolute and references a class defined in the global namespace', function () {
            this.globalNamespace.hasClass
                .withArgs('MyClass')
                .returns(true);

            expect(this.scope.hasClass('\\MyClass')).to.be.true;
        });

        it('should return true when the given path is absolute and references a class defined in a sub-namespace of the global one', function () {
            var subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant
                .withArgs('Some\\Sub')
                .returns(subNamespace);
            subNamespace.hasClass
                .withArgs('MyClass')
                .returns(true);

            expect(this.scope.hasClass('\\Some\\Sub\\MyClass')).to.be.true;
        });

        it('should return true when the given path is relative and references a class defined in a sub-namespace of this one', function () {
            var subNamespace = sinon.createStubInstance(Namespace);
            this.namespace.getDescendant
                .withArgs('Some\\Sub')
                .returns(subNamespace);
            subNamespace.hasClass
                .withArgs('MyClass')
                .returns(true);

            expect(this.scope.hasClass('Some\\Sub\\MyClass')).to.be.true;
        });

        it('should return true when the given path is relative and references a class defined in a sub-namespace of this one via an alias', function () {
            var subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant
                .withArgs('Some\\Sub')
                .returns(subNamespace);
            subNamespace.hasClass
                .withArgs('MyClass')
                .returns(true);
            this.scope.use('Some', 'IndirectlySome');

            expect(this.scope.hasClass('IndirectlySome\\Sub\\MyClass')).to.be.true;
        });

        it('should return false when the given class is not defined', function () {
            expect(this.scope.hasClass('\\SomeUndefinedClass')).to.be.false;
        });
    });

    describe('isGlobal()', function () {
        it('should return true when this is the special invisible global NamespaceScope', function () {
            var scope = new NamespaceScope(
                this.globalNamespace,
                this.valueFactory,
                this.callStack,
                this.module,
                this.namespace,
                true
            );

            expect(scope.isGlobal()).to.be.true;
        });

        it('should return false for a normal NamespaceScope', function () {
            expect(this.scope.isGlobal()).to.be.false;
        });
    });

    describe('resolveClass()', function () {
        it('should support resolving a class with no imports involved', function () {
            var result = this.scope.resolveClass('MyClass');

            expect(result.namespace).to.equal(this.namespace);
            expect(result.name).to.equal('MyClass');
        });

        it('should support resolving a class with whole name aliased case-insensitively', function () {
            var result;
            this.scope.use('MyClass', 'AnAliasForMyClass');

            result = this.scope.resolveClass('analiasFORMYClAsS');

            expect(result.namespace).to.equal(this.globalNamespace);
            expect(result.name).to.equal('MyClass');
        });

        it('should support resolving a relative class path with prefix aliased case-insensitively', function () {
            var result,
                subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant.withArgs('The\\Namespace\\Of\\My').returns(subNamespace);
            this.scope.use('The\\Namespace\\Of', 'TheAliasOfIt');

            result = this.scope.resolveClass('thealIASOFit\\My\\PhpClass');

            expect(result.namespace).to.equal(subNamespace);
            expect(result.name).to.equal('PhpClass');
        });

        it('should support resolving a relative path to a class defined in a sub-namespace of this one', function () {
            var result,
                subNamespace = sinon.createStubInstance(Namespace);
            this.namespace.getDescendant
                .withArgs('Some\\Sub')
                .returns(subNamespace);

            result = this.scope.resolveClass('Some\\Sub\\MyClass');

            expect(result.namespace).to.equal(subNamespace);
            expect(result.name).to.equal('MyClass');
        });

        it('should support resolving an absolute class path', function () {
            var result,
                subNamespace = sinon.createStubInstance(Namespace);
            this.globalNamespace.getDescendant.withArgs('The\\Absolute\\Path\\To\\My').returns(subNamespace);
            this.scope.use('I\\Should\\Be\\Ignored', 'The');

            result = this.scope.resolveClass('\\The\\Absolute\\Path\\To\\My\\AbsPhpClass');

            expect(result.namespace).to.equal(subNamespace);
            expect(result.name).to.equal('AbsPhpClass');
        });

        it('should support resolving an absolute path to a class in the global namespace', function () {
            var result = this.scope.resolveClass('\\MyClass');

            expect(result.namespace).to.equal(this.globalNamespace);
            expect(result.name).to.equal('MyClass');
        });

        it('should support resolving a path prefixed with the special namespace keyword to the current namespace only, ignoring any "use" imports', function () {
            var result,
                subNamespace = sinon.createStubInstance(Namespace);
            this.namespace.getDescendant.withArgs('Stuff\\Here').returns(subNamespace);
            this.scope.use('Some\\Other\\StuffNamespace', 'Stuff');

            result = this.scope.resolveClass('namespace\\Stuff\\Here\\MyClass');

            expect(result.namespace).to.equal(subNamespace);
            expect(result.name).to.equal('MyClass');
        });

        it('should support resolving a path prefixed with the special namespace keyword using mixed case to the current namespace only, ignoring any "use" imports', function () {
            var result,
                subNamespace = sinon.createStubInstance(Namespace);
            this.namespace.getDescendant.withArgs('Stuff\\Here').returns(subNamespace);
            this.scope.use('Some\\Other\\StuffNamespace', 'Stuff');

            result = this.scope.resolveClass('naMESPaCe\\Stuff\\Here\\MyClass');

            expect(result.namespace).to.equal(subNamespace);
            expect(result.name).to.equal('MyClass');
        });
    });

    describe('use()', function () {
        it('should recognise duplicate aliases case-insensitively', function () {
            this.scope.use('My\\App\\Stuff', 'MyStuff');

            expect(function () {
                this.scope.use('My\\App\\Stuff', 'mYSTuff');
            }.bind(this)).to.throw(
                'PHP Fatal error: [core.cannot_use_as_name_already_in_use] {"alias":"mYSTuff","source":"My\\\\App\\\\Stuff"}'
            );
        });
    });
});
