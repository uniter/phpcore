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
    CallStack = require('../../src/CallStack'),
    ClassAutoloader = require('../../src/ClassAutoloader').sync(),
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    FunctionSpec = require('../../src/Function/FunctionSpec'),
    FunctionSpecFactory = require('../../src/Function/FunctionSpecFactory'),
    Namespace = require('../../src/Namespace').sync(),
    NamespaceFactory = require('../../src/NamespaceFactory'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError,
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Namespace', function () {
    var callStack,
        classAutoloader,
        createNamespace,
        functionFactory,
        functionSpecFactory,
        globalNamespace,
        namespace,
        namespaceFactory,
        namespaceScope,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        classAutoloader = sinon.createStubInstance(ClassAutoloader);
        functionFactory = sinon.createStubInstance(FunctionFactory);
        functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
        namespaceFactory = sinon.createStubInstance(NamespaceFactory);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        valueFactory = new ValueFactory();

        callStack.raiseTranslatedError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, translationKey, placeholderVariables) {
                throw new Error(
                    'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
                );
            });
        callStack.raiseUncatchableFatalError.callsFake(function (translationKey, placeholderVariables) {
            throw new PHPFatalError(
                'Fake uncatchable fatal error for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {}),
                '/path/to/my_module.php',
                1234
            );
        });

        functionFactory.create.callsFake(function (namespace, currentClass, func, name, currentObject) {
            var wrapperFunc = sinon.stub();
            wrapperFunc.testArgs = {
                namespace: namespace,
                currentClass: currentClass,
                currentObject: currentObject,
                func: func,
                name: name
            };
            return wrapperFunc;
        });

        namespaceFactory.create.callsFake(function (parentNamespace, name) {
            return new Namespace(
                callStack,
                valueFactory,
                namespaceFactory,
                functionFactory,
                functionSpecFactory,
                classAutoloader,
                parentNamespace || null,
                name || ''
            );
        });

        namespaceScope.hasClass.returns(false);

        globalNamespace = namespaceFactory.create();
        namespace = globalNamespace;
        createNamespace = function (name) {
            namespace = globalNamespace.getDescendant(name);

            return namespace;
        };
    });

    describe('aliasFunction()', function () {
        it('should define the alias function correctly', function () {
            var aliasFunction = sinon.stub(),
                functionSpec = sinon.createStubInstance(FunctionSpec),
                originalFunction = sinon.stub(),
                parametersSpecData = [{name: 'param1'}, {name: 'param2'}],
                wrappedFunction = sinon.stub();
            callStack.getLastFilePath.returns('/path/to/my_module.php');
            functionSpecFactory.createFunctionSpec
                .withArgs(
                    sinon.match.same(namespaceScope),
                    'myOriginalFunc',
                    parametersSpecData,
                    '/path/to/my_module.php',
                    123
                )
                .returns(functionSpec);
            functionFactory.create
                .withArgs(
                    sinon.match.same(namespaceScope),
                    null,
                    sinon.match.same(originalFunction),
                    'myOriginalFunc',
                    null,
                    null,
                    sinon.match.same(functionSpec)
                )
                .returns(wrappedFunction);
            namespace.defineFunction(
                'myOriginalFunc',
                originalFunction,
                namespaceScope,
                parametersSpecData,
                123
            );
            wrappedFunction.functionSpec = functionSpec;
            wrappedFunction.originalFunc = originalFunction;
            functionSpec.createAliasFunction
                .withArgs(
                    'myAliasFunc',
                    sinon.match.same(originalFunction),
                    sinon.match.same(functionSpecFactory),
                    sinon.match.same(functionFactory)
                )
                .returns(aliasFunction);

            namespace.aliasFunction('myOriginalFunc', 'myAliasFunc');

            expect(namespace.getFunction('myAliasFunc')).to.equal(aliasFunction);
        });

        it('should throw when the original function being aliased does not exist', function () {
            expect(function () {
                namespace.aliasFunction('myUndefinedFunc', 'myAliasFunc');
            }).to.throw(
                'Cannot alias undefined function "myUndefinedFunc"'
            );
        });
    });

    describe('defineClass()', function () {
        it('should raise an uncatchable fatal error when the class is already defined', function () {
            namespace.defineClass('MyClass', function () {}, namespaceScope);
            namespaceScope.hasClass
                .withArgs('MyClass')
                .returns(true);

            expect(function () {
                namespace.defineClass('MyClass', function () {}, namespaceScope);
            }).to.throw(
                PHPFatalError,
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_redeclare_class_as_name_already_in_use ' +
                'with {"className":"MyClass"} in /path/to/my_module.php on line 1234'
            );
        });

        it('should raise an uncatchable fatal error when the name is already used by an import', function () {
            namespaceScope.hasClass
                .withArgs('MyClass')
                .returns(true);

            expect(function () {
                namespace.defineClass('MyClass', function () {}, namespaceScope);
            }).to.throw(
                PHPFatalError,
                // NB: This is not quite the same translation as above: "cannot_declare..." vs. "cannot_redeclare..."
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_declare_class_as_name_already_in_use ' +
                'with {"className":"MyClass"} in /path/to/my_module.php on line 1234'
            );
        });

        it('should raise an uncatchable fatal error when a PHP-defined class attempts to implement Throwable', function () {
            namespaceScope.resolveClass
                .withArgs('Throwable')
                .returns({
                    namespace: globalNamespace,
                    name: 'Throwable'
                });

            expect(function () {
                namespace.defineClass('MyInvalidThrowable', {
                    interfaces: ['Throwable'],
                    properties: {},
                    methods: []
                }, namespaceScope);
            }).to.throw(
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_implement_throwable ' +
                'with {"className":"MyInvalidThrowable"} in /path/to/my_module.php on line 1234'
            );
        });

        it('should not raise an uncatchable fatal error when a PHP-defined class attempts to implement an interface named Throwable from a non-global namespace', function () {
            namespaceScope.resolveClass
                .withArgs('Throwable')
                .returns({
                    namespace: globalNamespace.getDescendant('Not\\TheGlobal'),
                    name: 'Throwable'
                });

            expect(function () {
                namespace.defineClass('MyInvalidThrowable', {
                    interfaces: ['Throwable'],
                    properties: {},
                    methods: []
                }, namespaceScope);
            }).not.to.throw();
        });
    });

    describe('defineConstant()', function () {
        describe('when a constant is not already defined with the given name', function () {
            it('should not raise a notice', function () {
                namespace.defineConstant('MY_CONST', valueFactory.createString('my value'));

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });

            it('should define the constant', function () {
                namespace.defineConstant('MY_CONST', valueFactory.createString('my value'));

                expect(namespace.getConstant('MY_CONST', true).getNative()).to.equal('my value');
            });
        });

        describe('when a constant is already defined with the given name', function () {
            beforeEach(function () {
                createNamespace('My\\Space');

                namespace.defineConstant('MY_CONST', valueFactory.createString('my original value'));
            });

            it('should raise a notice with the namespace prefix lowercased', function () {
                namespace.defineConstant('MY_CONST', valueFactory.createString('my new value'));

                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'core.constant_already_defined',
                    {
                        name: 'my\\space\\MY_CONST'
                    }
                );
            });

            it('should not redefine the constant', function () {
                namespace.defineConstant('MY_CONST', valueFactory.createString('my new value'));

                expect(namespace.getConstant('MY_CONST', true).getNative())
                    .to.equal('my original value');
            });
        });
    });

    describe('defineFunction()', function () {
        it('should correctly define the function with a FunctionSpec', function () {
            var functionSpec = sinon.createStubInstance(FunctionSpec),
                originalFunction = sinon.stub(),
                parametersSpecData = [{name: 'param1'}, {name: 'param2'}],
                wrappedFunction = sinon.stub();
            callStack.getLastFilePath.returns('/path/to/my_module.php');
            functionSpecFactory.createFunctionSpec
                .withArgs(
                    sinon.match.same(namespaceScope),
                    'myFunction',
                    parametersSpecData,
                    '/path/to/my_module.php',
                    123
                )
                .returns(functionSpec);
            functionFactory.create
                .withArgs(
                    sinon.match.same(namespaceScope),
                    null,
                    sinon.match.same(originalFunction),
                    'myFunction',
                    null,
                    null,
                    sinon.match.same(functionSpec)
                )
                .returns(wrappedFunction);

            namespace.defineFunction(
                'myFunction',
                originalFunction,
                namespaceScope,
                parametersSpecData,
                123
            );

            expect(namespace.getFunction('myFunction')).to.equal(wrappedFunction);
        });
    });

    describe('getClass()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly fetch an unqualified class name from the global namespace', function () {
                var classObject;
                namespace.defineClass('MyClass', function () {}, namespaceScope);

                classObject = namespace.getClass('MyClass');

                expect(classObject.getName()).to.equal('MyClass');
            });

            it('should correctly fetch a class name qualified by just a leading slash from the global namespace', function () {
                var classObject;
                namespace.defineClass('MyClass', function () {}, namespaceScope);

                classObject = namespace.getClass('\\MyClass');

                expect(classObject.getName()).to.equal('MyClass');
            });

            it('should correctly fetch a fully-qualified class name from the relevant sub-namespace', function () {
                var classObject;
                globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                classObject = namespace.getClass('\\My\\Stuff\\MyClass');

                expect(classObject.getName()).to.equal('My\\Stuff\\MyClass');
            });

            it('should correctly fetch a relatively-qualified class name from the relevant sub-namespace', function () {
                var classObject;
                globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                classObject = namespace.getClass('My\\Stuff\\MyClass');

                expect(classObject.getName()).to.equal('My\\Stuff\\MyClass');
            });

            describe('for an undefined class being successfully autoloaded', function () {
                beforeEach(function () {
                    // Fake a successful autoloading
                    classAutoloader.autoloadClass.callsFake(function () {
                        globalNamespace.getDescendant('My\\Lib')
                            .defineClass('MyAutoloadedClass', function () {}, namespaceScope);
                    });
                });

                it('should invoke the autoloader correctly', function () {
                    namespace.getClass('My\\Lib\\MyAutoloadedClass');

                    expect(classAutoloader.autoloadClass).to.have.been.calledOnce;
                    expect(classAutoloader.autoloadClass).to.have.been.calledWith('My\\Lib\\MyAutoloadedClass');
                });

                it('should return the autoloaded class', function () {
                    var classObject = namespace.getClass('My\\Lib\\MyAutoloadedClass');

                    expect(classObject.getName()).to.equal('My\\Lib\\MyAutoloadedClass');
                });

                it('should not raise any error', function () {
                    expect(function () {
                        namespace.getClass('My\\Lib\\MyAutoloadedClass');
                    }).not.to.throw();
                });
            });

            describe('for an undefined class that is not successfully autoloaded', function () {
                it('should invoke the autoloader correctly', function () {
                    try {
                        namespace.getClass('My\\Lib\\MyAutoloadedClass');
                    } catch (e) {}

                    expect(classAutoloader.autoloadClass).to.have.been.calledOnce;
                    expect(classAutoloader.autoloadClass).to.have.been.calledWith('My\\Lib\\MyAutoloadedClass');
                });

                it('should raise a "class not found" error', function () {
                    expect(function () {
                        namespace.getClass('My\\Lib\\MyAutoloadedClass');
                    }).to.throw(
                        'Fake PHP Fatal error for #core.class_not_found with {"name":"My\\\\Lib\\\\MyAutoloadedClass"}'
                    );
                });
            });
        });

        describe('when the current namespace is a sub-namespace', function () {
            beforeEach(function () {
                createNamespace('My\\Sub\\Space');
            });

            it('should correctly fetch an unqualified name from the current namespace', function () {
                var classObject;
                namespace.defineClass('MyClass', function () {}, namespaceScope);

                classObject = namespace.getClass('MyClass');

                expect(classObject.getName()).to.equal('My\\Sub\\Space\\MyClass');
            });

            it('should correctly fetch a name qualified by just a leading slash from the global namespace', function () {
                var classObject;
                globalNamespace.defineClass('MyClass', function () {}, namespaceScope);

                classObject = namespace.getClass('\\MyClass');

                expect(classObject.getName()).to.equal('MyClass');
            });

            it('should correctly fetch a fully-qualified name from the relevant sub-namespace, relative to global', function () {
                var classObject;
                globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                classObject = namespace.getClass('\\My\\Stuff\\MyClass');

                expect(classObject.getName()).to.equal('My\\Stuff\\MyClass');
            });

            it('should correctly fetch a relatively-qualified name from the relevant sub-namespace, relative to current', function () {
                var classObject;
                globalNamespace.getDescendant('My\\Sub\\Space\\Your\\Stuff')
                    .defineClass('YourClass', function () {}, namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                classObject = namespace.getClass('Your\\Stuff\\YourClass');

                expect(classObject.getName()).to.equal('My\\Sub\\Space\\Your\\Stuff\\YourClass');
            });

            describe('for an undefined class being successfully autoloaded', function () {
                beforeEach(function () {
                    // Fake a successful autoloading
                    classAutoloader.autoloadClass.callsFake(function () {
                        namespace.getDescendant('Your\\Stuff')
                            .defineClass('YourAutoloadedClass', function () {}, namespaceScope);
                    });
                });

                it('should invoke the autoloader correctly', function () {
                    namespace.getClass('Your\\Stuff\\YourAutoloadedClass');

                    expect(classAutoloader.autoloadClass).to.have.been.calledOnce;
                    expect(classAutoloader.autoloadClass).to.have.been.calledWith(
                        // Note that the relative class path should be resolved relative to the current namespace
                        'My\\Sub\\Space\\Your\\Stuff\\YourAutoloadedClass'
                    );
                });
            });
        });
    });

    describe('getConstant()', function () {
        describe('when the constant is within a namespace', function () {
            describe('when the constant is defined', function () {
                beforeEach(function () {
                    namespace.defineConstant('MY_CONST', valueFactory.createInteger(21));
                });

                it('should return its value', function () {
                    expect(namespace.getConstant('MY_CONST', true).getNative()).to.equal(21);
                });

                it('should not raise a notice', function () {
                    namespace.getConstant('MY_CONST', true);

                    expect(callStack.raiseError).not.to.have.been.called;
                });
            });

            describe('when the constant is not defined', function () {
                it('should raise an error', function () {
                    expect(function () {
                        namespace.getConstant('MY_UNDEFINED_CONST', true);
                    }).to.throw(
                        'Fake PHP Fatal error for #core.undefined_constant with {"name":"MY_UNDEFINED_CONST"}'
                    );
                });
            });
        });

        describe('when the constant is not within a namespace', function () {
            describe('when the constant is defined', function () {
                beforeEach(function () {
                    namespace.defineConstant('MY_CONST', valueFactory.createInteger(21));
                });

                it('should return its value', function () {
                    expect(namespace.getConstant('MY_CONST', false).getNative()).to.equal(21);
                });

                it('should not raise a warning', function () {
                    namespace.getConstant('MY_CONST', false);

                    expect(callStack.raiseError).not.to.have.been.called;
                });
            });

            describe('when the constant is not defined', function () {
                it('should return the constant\'s name as a string', function () {
                    var result = namespace.getConstant('MY_UNDEFINED_CONST', false);

                    expect(result.getType()).to.equal('string');
                    expect(result.getNative()).to.equal('MY_UNDEFINED_CONST');
                });

                it('should raise a warning', function () {
                    namespace.getConstant('MY_UNDEFINED_CONST', false);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_WARNING,
                        'Use of undefined constant MY_UNDEFINED_CONST - assumed \'MY_UNDEFINED_CONST\' (this will throw an Error in a future version of PHP)'
                    );
                });
            });
        });
    });

    describe('getDescendant()', function () {
        it('should fetch descendant namespaces case-insensitively', function () {
            var descendantNamespace;
            createNamespace('MyNamespace');

            descendantNamespace = namespace.getDescendant('My\\Namespace\\Path');

            expect(namespace.getDescendant('mY\\NameSPACE\\PaTh')).to.equal(descendantNamespace);
        });

        it('should throw when the name given is empty', function () {
            expect(function () {
                namespace.getDescendant('');
            }).to.throw(
                'Namespace.getDescendant() :: Name cannot be empty'
            );
        });
    });

    describe('getFunction()', function () {
        var func;

        beforeEach(function () {
            func = sinon.stub();
            createNamespace('My\\Stuff\\MyNamespace');
        });

        it('should simply return a native function if specified', function () {
            namespace.defineFunction('myFunction', func, namespaceScope);

            expect(namespace.getFunction(func)).to.equal(func);
        });

        it('should retrieve the function with correct case', function () {
            namespace.defineFunction('myFunction', func, namespaceScope);

            expect(namespace.getFunction('myFunction').testArgs.func).to.equal(func);
        });

        it('should retrieve the function case-insensitively', function () {
            namespace.defineFunction('myFunction', func, namespaceScope);

            expect(namespace.getFunction('MYFUNctioN').testArgs.func).to.equal(func);
        });

        it('should fall back to the global namespace if the function does not exist in this one', function () {
            var theFunction = sinon.stub();
            globalNamespace.defineFunction('thefunction', theFunction, namespaceScope);

            expect(namespace.getFunction('THEFunCTion').testArgs.func).to.equal(theFunction);
        });

        it('should allow functions in this namespace to override those in the global one', function () {
            var functionInGlobalSpace = sinon.stub(),
                functionInThisSpace = sinon.stub();
            globalNamespace.defineFunction('thefunction', functionInGlobalSpace, namespaceScope);
            namespace.defineFunction('theFunction', functionInThisSpace, namespaceScope);

            expect(namespace.getFunction('theFunction').testArgs.func).to.equal(functionInThisSpace);
        });

        it('should raise an error when the function is not defined in the current nor global namespaces', function () {
            expect(function () {
                namespace.getFunction('someUndefinedFunc');
            }).to.throw(
                'Fake PHP Fatal error for #core.call_to_undefined_function ' +
                'with {"name":"My\\\\Stuff\\\\MyNamespace\\\\someUndefinedFunc"}'
            );
        });
    });

    describe('getName()', function () {
        it('should return the name of the namespace prefixed with the parent\'s name', function () {
            createNamespace('The\\Parent\\Of\\MyNamespace');

            expect(namespace.getName()).to.equal('The\\Parent\\Of\\MyNamespace');
        });

        it('should return the empty string for the global namespace', function () {
            expect(globalNamespace.getName()).to.equal('');
        });
    });

    describe('getOwnFunction()', function () {
        var func;

        beforeEach(function () {
            func = sinon.stub();
            createNamespace('MyNamespace');
        });

        it('should retrieve the function with correct case', function () {
            namespace.defineFunction('myFunction', func, namespaceScope);

            expect(namespace.getOwnFunction('myFunction').testArgs.func).to.equal(func);
        });

        it('should retrieve the function case-insensitively', function () {
            namespace.defineFunction('myFunction', func, namespaceScope);

            expect(namespace.getOwnFunction('MYFUNctioN').testArgs.func).to.equal(func);
        });

        it('should not fall back to the global namespace if the function does not exist in this one', function () {
            var theFunction = sinon.stub();
            globalNamespace.defineFunction('thefunction', theFunction, namespaceScope);

            expect(namespace.getOwnFunction('thefunction')).to.be.null;
        });
    });

    describe('getPrefix()', function () {
        it('should return the full path of the namespace suffixed with a backslash', function () {
            createNamespace('The\\Parent\\Of\\MyNamespace');

            expect(namespace.getPrefix()).to.equal('The\\Parent\\Of\\MyNamespace\\');
        });

        it('should return the empty string for the global namespace', function () {
            expect(globalNamespace.getPrefix()).to.equal('');
        });
    });

    describe('hasClass()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly detect an unqualified class from the global namespace', function () {
                namespace.defineClass('MyClass', function () {}, namespaceScope);

                expect(namespace.hasClass('MyClass')).to.be.true;
            });

            it('should correctly detect a class with name qualified by just a leading slash from the global namespace', function () {
                namespace.defineClass('MyClass', function () {}, namespaceScope);

                expect(namespace.hasClass('\\MyClass')).to.be.true;
            });

            it('should correctly detect a fully-qualified class from the relevant sub-namespace', function () {
                globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                expect(namespace.hasClass('\\My\\Stuff\\MyClass')).to.be.true;
            });

            it('should correctly detect a relatively-qualified class from the relevant sub-namespace', function () {
                globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                expect(namespace.hasClass('My\\Stuff\\MyClass')).to.be.true;
            });

            describe('for an undefined class', function () {
                it('should not invoke the autoloader', function () {
                    namespace.hasClass('My\\Lib\\MyAutoloadedClass');

                    expect(classAutoloader.autoloadClass).not.to.have.been.called;
                });

                it('should return false', function () {
                    expect(namespace.hasClass('My\\Lib\\MyAutoloadedClass')).to.be.false;
                });
            });
        });

        describe('when the current namespace is a sub-namespace', function () {
            beforeEach(function () {
                createNamespace('My\\Sub\\Space');
            });

            it('should correctly detect an unqualified class from the current namespace', function () {
                namespace.defineClass('MyClass', function () {}, namespaceScope);

                expect(namespace.hasClass('MyClass')).to.be.true;
            });

            it('should correctly detect a class with name qualified by just a leading slash from the global namespace', function () {
                globalNamespace.defineClass('MyClass', function () {}, namespaceScope);

                expect(namespace.hasClass('\\MyClass')).to.be.true;
            });

            it('should correctly detect a fully-qualified class from the relevant sub-namespace, relative to global', function () {
                globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                expect(namespace.hasClass('\\My\\Stuff\\MyClass')).to.be.true;
            });

            it('should correctly detect a relatively-qualified class from the relevant sub-namespace, relative to current', function () {
                globalNamespace.getDescendant('My\\Sub\\Space\\Your\\Stuff')
                    .defineClass('YourClass', function () {}, namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                expect(namespace.hasClass('Your\\Stuff\\YourClass')).to.be.true;
            });

            describe('for an undefined class', function () {
                it('should not invoke the autoloader', function () {
                    namespace.hasClass('Your\\\\Stuff\\\\YourAutoloadedClass');

                    expect(classAutoloader.autoloadClass).not.to.have.been.called;
                });

                it('should return false', function () {
                    expect(namespace.hasClass('Your\\Stuff\\YourAutoloadedClass')).to.be.false;
                });
            });
        });
    });

    describe('hasConstant()', function () {
        it('should return true after a case-sensitive constant has been defined in the namespace', function () {
            createNamespace('MyNamespace');

            namespace.defineConstant('MY_CONST', 21);

            expect(namespace.hasConstant('MY_CONST')).to.be.true;
            expect(namespace.hasConstant('my_COnst')).to.be.false;
        });

        it('should return true after a case-insensitive constant has been defined in the namespace', function () {
            createNamespace('MyNamespace');

            namespace.defineConstant('ANOTHER_CONST', 21, {caseInsensitive: true});

            expect(namespace.hasConstant('ANOTHER_CONST')).to.be.true;
            expect(namespace.hasConstant('aNOther_consT')).to.be.true;
        });

        it('should return false for an undefined constant', function () {
            createNamespace('MyNamespace');

            namespace.defineConstant('SOME_CONST', 21);

            expect(namespace.hasConstant('A_DIFFERENT_CONST')).to.be.false;
        });
    });

    describe('hasFunction()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly detect an unqualified function from the global namespace', function () {
                namespace.defineFunction('myFunction', function () {}, namespaceScope);

                expect(namespace.hasFunction('myFunction')).to.be.true;
            });

            it('should correctly detect a function with name qualified by just a leading slash from the global namespace', function () {
                namespace.defineFunction('myFunction', function () {}, namespaceScope);

                expect(namespace.hasFunction('\\myFunction')).to.be.true;
            });

            it('should correctly detect a fully-qualified function from the relevant sub-namespace', function () {
                globalNamespace.getDescendant('My\\Stuff')
                    .defineFunction('myFunction', function () {}, namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                expect(namespace.hasFunction('\\My\\Stuff\\myFunction')).to.be.true;
            });

            it('should correctly detect a relatively-qualified function from the relevant sub-namespace', function () {
                globalNamespace.getDescendant('My\\Stuff')
                    .defineFunction('myFunction', function () {}, namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                expect(namespace.hasFunction('My\\Stuff\\myFunction')).to.be.true;
            });

            describe('for an undefined function', function () {
                it('should return false', function () {
                    expect(namespace.hasFunction('My\\Lib\\myFunction')).to.be.false;
                });
            });
        });

        describe('when the current namespace is a sub-namespace', function () {
            beforeEach(function () {
                createNamespace('My\\Sub\\Space');
            });

            it('should correctly detect an unqualified function from the current namespace', function () {
                namespace.defineFunction('myFunction', function () {}, namespaceScope);

                expect(namespace.hasFunction('myFunction')).to.be.true;
            });

            it('should correctly detect a function with name qualified by just a leading slash from the global namespace', function () {
                globalNamespace.defineFunction('myFunction', function () {}, namespaceScope);

                expect(namespace.hasFunction('\\myFunction')).to.be.true;
            });

            it('should correctly detect a fully-qualified function from the relevant sub-namespace, relative to global', function () {
                globalNamespace.getDescendant('My\\Stuff')
                    .defineFunction('myFunction', function () {}, namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                expect(namespace.hasFunction('\\My\\Stuff\\myFunction')).to.be.true;
            });

            it('should correctly detect a relatively-qualified function from the relevant sub-namespace, relative to current', function () {
                globalNamespace.getDescendant('My\\Sub\\Space\\Your\\Stuff')
                    .defineFunction('YourFunction', function () {}, namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                expect(namespace.hasFunction('Your\\Stuff\\YourFunction')).to.be.true;
            });

            describe('for an undefined function', function () {
                it('should return false', function () {
                    expect(namespace.hasFunction('Your\\Stuff\\YourFunction')).to.be.false;
                });
            });
        });
    });

    describe('parseName()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly resolve an unqualified name to the global namespace', function () {
                var parsed = namespace.parseName('MyName');

                expect(parsed.namespace).to.equal(globalNamespace);
                expect(parsed.name).to.equal('MyName');
            });

            it('should correctly resolve a name qualified by just a leading slash to the global namespace', function () {
                var parsed = namespace.parseName('\\MyName');

                expect(parsed.namespace).to.equal(globalNamespace);
                expect(parsed.name).to.equal('MyName');
            });

            it('should correctly resolve a fully-qualified name to the relevant sub-namespace', function () {
                var parsed,
                    subNamespace = globalNamespace.getDescendant('My\\Stuff');

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                parsed = namespace.parseName('\\My\\Stuff\\MyClass');

                expect(parsed.namespace).to.equal(subNamespace);
                expect(parsed.name).to.equal('MyClass');
            });

            it('should correctly resolve a relatively-qualified name to the relevant sub-namespace', function () {
                var parsed,
                    subNamespace = globalNamespace.getDescendant('My\\Stuff');

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                parsed = namespace.parseName('My\\Stuff\\MyClass');

                expect(parsed.namespace).to.equal(subNamespace);
                expect(parsed.name).to.equal('MyClass');
            });
        });

        describe('when the current namespace is a sub-namespace', function () {
            beforeEach(function () {
                createNamespace('My\\Sub\\Space');
            });

            it('should correctly resolve an unqualified name to the current namespace', function () {
                var parsed = namespace.parseName('MyName');

                expect(parsed.namespace).to.equal(namespace);
                expect(parsed.name).to.equal('MyName');
            });

            it('should correctly resolve a name qualified by just a leading slash to the global namespace', function () {
                var parsed = namespace.parseName('\\MyName');

                expect(parsed.namespace).to.equal(globalNamespace);
                expect(parsed.name).to.equal('MyName');
            });

            it('should correctly resolve a fully-qualified name to the relevant sub-namespace, relative to global', function () {
                var parsed,
                    subNamespace = globalNamespace.getDescendant('My\\Stuff');

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                parsed = namespace.parseName('\\My\\Stuff\\MyClass');

                expect(parsed.namespace).to.equal(subNamespace);
                expect(parsed.name).to.equal('MyClass');
            });

            it('should correctly resolve a relatively-qualified name to the relevant sub-namespace, relative to current', function () {
                var parsed,
                    subNamespace = globalNamespace.getDescendant('My\\Sub\\Space\\Your\\Stuff');

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                parsed = namespace.parseName('Your\\Stuff\\YourClass');

                expect(parsed.namespace).to.equal(subNamespace);
                expect(parsed.name).to.equal('YourClass');
            });
        });
    });
});
