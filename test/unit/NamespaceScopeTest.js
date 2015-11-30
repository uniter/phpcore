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
    Class = require('../../src/Class').sync(),
    Namespace = require('../../src/Namespace').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    StringValue = require('../../src/Value/String').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('NamespaceScope', function () {
    beforeEach(function () {
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.namespace = sinon.createStubInstance(Namespace);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.valueFactory.createString.restore();
        sinon.stub(this.valueFactory, 'createString', function (string) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getNative.returns(string);
            return stringValue;
        });

        this.scope = new NamespaceScope(this.globalNamespace, this.valueFactory, this.namespace);
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

    describe('getNamespaceName()', function () {
        it('should return the name of the namespace', function () {
            this.namespace.getName.returns('My\\Namespace');

            expect(this.scope.getNamespaceName().getNative()).to.equal('My\\Namespace');
        });
    });

    describe('use()', function () {
        it('should recognise duplicate aliases case-insensitively', function () {
            this.scope.use('My\\App\\Stuff', 'MyStuff');

            expect(function () {
                this.scope.use('My\\App\\Stuff', 'mYSTuff');
            }.bind(this)).to.throw('Cannot use My\\App\\Stuff as mYSTuff because the name is already in use');
        });
    });
});
