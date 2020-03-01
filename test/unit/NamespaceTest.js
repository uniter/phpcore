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
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.classAutoloader = sinon.createStubInstance(ClassAutoloader);
        this.functionFactory = sinon.createStubInstance(FunctionFactory);
        this.functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
        this.namespaceFactory = sinon.createStubInstance(NamespaceFactory);
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.valueFactory = new ValueFactory();

        this.callStack.raiseTranslatedError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, translationKey, placeholderVariables) {
                throw new Error(
                    'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
                );
            });
        this.callStack.raiseUncatchableFatalError.callsFake(function (translationKey, placeholderVariables) {
            throw new PHPFatalError(
                'Fake uncatchable fatal error for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {}),
                '/path/to/my_module.php',
                1234
            );
        });

        this.functionFactory.create.callsFake(function (namespace, currentClass, func, name, currentObject) {
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

        this.namespaceFactory.create.callsFake(function (parentNamespace, name) {
            return new Namespace(
                this.callStack,
                this.valueFactory,
                this.namespaceFactory,
                this.functionFactory,
                this.functionSpecFactory,
                this.classAutoloader,
                parentNamespace || null,
                name || ''
            );
        }.bind(this));

        this.namespaceScope.hasClass.returns(false);

        this.globalNamespace = this.namespaceFactory.create();
        this.namespace = this.globalNamespace;
        this.createNamespace = function (name) {
            this.namespace = this.globalNamespace.getDescendant(name);

            return this.namespace;
        }.bind(this);
    });

    describe('defineClass()', function () {
        it('should raise an uncatchable fatal error when the class is already defined', function () {
            this.namespace.defineClass('MyClass', function () {}, this.namespaceScope);
            this.namespaceScope.hasClass
                .withArgs('MyClass')
                .returns(true);

            expect(function () {
                this.namespace.defineClass('MyClass', function () {}, this.namespaceScope);
            }.bind(this)).to.throw(
                PHPFatalError,
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_redeclare_class_as_name_already_in_use ' +
                'with {"className":"MyClass"} in /path/to/my_module.php on line 1234'
            );
        });

        it('should raise an uncatchable fatal error when the name is already used by an import', function () {
            this.namespaceScope.hasClass
                .withArgs('MyClass')
                .returns(true);

            expect(function () {
                this.namespace.defineClass('MyClass', function () {}, this.namespaceScope);
            }.bind(this)).to.throw(
                PHPFatalError,
                // NB: This is not quite the same translation as above: "cannot_declare..." vs. "cannot_redeclare..."
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_declare_class_as_name_already_in_use ' +
                'with {"className":"MyClass"} in /path/to/my_module.php on line 1234'
            );
        });

        it('should raise an uncatchable fatal error when a PHP-defined class attempts to implement Throwable', function () {
            this.namespaceScope.resolveClass
                .withArgs('Throwable')
                .returns({
                    namespace: this.globalNamespace,
                    name: 'Throwable'
                });

            expect(function () {
                this.namespace.defineClass('MyInvalidThrowable', {
                    interfaces: ['Throwable'],
                    properties: {},
                    methods: []
                }, this.namespaceScope);
            }.bind(this)).to.throw(
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_implement_throwable ' +
                'with {"className":"MyInvalidThrowable"} in /path/to/my_module.php on line 1234'
            );
        });

        it('should not raise an uncatchable fatal error when a PHP-defined class attempts to implement an interface named Throwable from a non-global namespace', function () {
            this.namespaceScope.resolveClass
                .withArgs('Throwable')
                .returns({
                    namespace: this.globalNamespace.getDescendant('Not\\TheGlobal'),
                    name: 'Throwable'
                });

            expect(function () {
                this.namespace.defineClass('MyInvalidThrowable', {
                    interfaces: ['Throwable'],
                    properties: {},
                    methods: []
                }, this.namespaceScope);
            }.bind(this)).not.to.throw();
        });
    });

    describe('defineConstant()', function () {
        describe('when a constant is not already defined with the given name', function () {
            it('should not raise a notice', function () {
                this.namespace.defineConstant('MY_CONST', this.valueFactory.createString('my value'));

                expect(this.callStack.raiseTranslatedError).not.to.have.been.called;
            });

            it('should define the constant', function () {
                this.namespace.defineConstant('MY_CONST', this.valueFactory.createString('my value'));

                expect(this.namespace.getConstant('MY_CONST', true).getNative()).to.equal('my value');
            });
        });

        describe('when a constant is already defined with the given name', function () {
            beforeEach(function () {
                this.createNamespace('My\\Space');

                this.namespace.defineConstant('MY_CONST', this.valueFactory.createString('my original value'));
            });

            it('should raise a notice with the namespace prefix lowercased', function () {
                this.namespace.defineConstant('MY_CONST', this.valueFactory.createString('my new value'));

                expect(this.callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(this.callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'core.constant_already_defined',
                    {
                        name: 'my\\space\\MY_CONST'
                    }
                );
            });

            it('should not redefine the constant', function () {
                this.namespace.defineConstant('MY_CONST', this.valueFactory.createString('my new value'));

                expect(this.namespace.getConstant('MY_CONST', true).getNative())
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
            this.callStack.getLastFilePath.returns('/path/to/my_module.php');
            this.functionSpecFactory.createFunctionSpec
                .withArgs(
                    sinon.match.same(this.namespaceScope),
                    'myFunction',
                    parametersSpecData,
                    '/path/to/my_module.php',
                    123
                )
                .returns(functionSpec);
            this.functionFactory.create
                .withArgs(
                    sinon.match.same(this.namespaceScope),
                    null,
                    sinon.match.same(originalFunction),
                    'myFunction',
                    null,
                    null,
                    sinon.match.same(functionSpec)
                )
                .returns(wrappedFunction);

            this.namespace.defineFunction(
                'myFunction',
                originalFunction,
                this.namespaceScope,
                parametersSpecData,
                123
            );

            expect(this.namespace.getFunction('myFunction')).to.equal(wrappedFunction);
        });
    });

    describe('getClass()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly fetch an unqualified class name from the global namespace', function () {
                var classObject;
                this.namespace.defineClass('MyClass', function () {}, this.namespaceScope);

                classObject = this.namespace.getClass('MyClass');

                expect(classObject.getName()).to.equal('MyClass');
            });

            it('should correctly fetch a class name qualified by just a leading slash from the global namespace', function () {
                var classObject;
                this.namespace.defineClass('MyClass', function () {}, this.namespaceScope);

                classObject = this.namespace.getClass('\\MyClass');

                expect(classObject.getName()).to.equal('MyClass');
            });

            it('should correctly fetch a fully-qualified class name from the relevant sub-namespace', function () {
                var classObject;
                this.globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, this.namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                classObject = this.namespace.getClass('\\My\\Stuff\\MyClass');

                expect(classObject.getName()).to.equal('My\\Stuff\\MyClass');
            });

            it('should correctly fetch a relatively-qualified class name from the relevant sub-namespace', function () {
                var classObject;
                this.globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, this.namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                classObject = this.namespace.getClass('My\\Stuff\\MyClass');

                expect(classObject.getName()).to.equal('My\\Stuff\\MyClass');
            });

            describe('for an undefined class being successfully autoloaded', function () {
                beforeEach(function () {
                    // Fake a successful autoloading
                    this.classAutoloader.autoloadClass.callsFake(function () {
                        this.globalNamespace.getDescendant('My\\Lib')
                            .defineClass('MyAutoloadedClass', function () {}, this.namespaceScope);
                    }.bind(this));
                });

                it('should invoke the autoloader correctly', function () {
                    this.namespace.getClass('My\\Lib\\MyAutoloadedClass');

                    expect(this.classAutoloader.autoloadClass).to.have.been.calledOnce;
                    expect(this.classAutoloader.autoloadClass).to.have.been.calledWith('My\\Lib\\MyAutoloadedClass');
                });

                it('should return the autoloaded class', function () {
                    var classObject = this.namespace.getClass('My\\Lib\\MyAutoloadedClass');

                    expect(classObject.getName()).to.equal('My\\Lib\\MyAutoloadedClass');
                });

                it('should not raise any error', function () {
                    expect(function () {
                        this.namespace.getClass('My\\Lib\\MyAutoloadedClass');
                    }.bind(this)).not.to.throw();
                });
            });

            describe('for an undefined class that is not successfully autoloaded', function () {
                it('should invoke the autoloader correctly', function () {
                    try {
                        this.namespace.getClass('My\\Lib\\MyAutoloadedClass');
                    } catch (e) {}

                    expect(this.classAutoloader.autoloadClass).to.have.been.calledOnce;
                    expect(this.classAutoloader.autoloadClass).to.have.been.calledWith('My\\Lib\\MyAutoloadedClass');
                });

                it('should raise a "class not found" error', function () {
                    expect(function () {
                        this.namespace.getClass('My\\Lib\\MyAutoloadedClass');
                    }.bind(this)).to.throw(
                        'Fake PHP Fatal error for #core.class_not_found with {"name":"My\\\\Lib\\\\MyAutoloadedClass"}'
                    );
                });
            });
        });

        describe('when the current namespace is a sub-namespace', function () {
            beforeEach(function () {
                this.createNamespace('My\\Sub\\Space');
            });

            it('should correctly fetch an unqualified name from the current namespace', function () {
                var classObject;
                this.namespace.defineClass('MyClass', function () {}, this.namespaceScope);

                classObject = this.namespace.getClass('MyClass');

                expect(classObject.getName()).to.equal('My\\Sub\\Space\\MyClass');
            });

            it('should correctly fetch a name qualified by just a leading slash from the global namespace', function () {
                var classObject;
                this.globalNamespace.defineClass('MyClass', function () {}, this.namespaceScope);

                classObject = this.namespace.getClass('\\MyClass');

                expect(classObject.getName()).to.equal('MyClass');
            });

            it('should correctly fetch a fully-qualified name from the relevant sub-namespace, relative to global', function () {
                var classObject;
                this.globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, this.namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                classObject = this.namespace.getClass('\\My\\Stuff\\MyClass');

                expect(classObject.getName()).to.equal('My\\Stuff\\MyClass');
            });

            it('should correctly fetch a relatively-qualified name from the relevant sub-namespace, relative to current', function () {
                var classObject;
                this.globalNamespace.getDescendant('My\\Sub\\Space\\Your\\Stuff')
                    .defineClass('YourClass', function () {}, this.namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                classObject = this.namespace.getClass('Your\\Stuff\\YourClass');

                expect(classObject.getName()).to.equal('My\\Sub\\Space\\Your\\Stuff\\YourClass');
            });

            describe('for an undefined class being successfully autoloaded', function () {
                beforeEach(function () {
                    // Fake a successful autoloading
                    this.classAutoloader.autoloadClass.callsFake(function () {
                        this.namespace.getDescendant('Your\\Stuff')
                            .defineClass('YourAutoloadedClass', function () {}, this.namespaceScope);
                    }.bind(this));
                });

                it('should invoke the autoloader correctly', function () {
                    this.namespace.getClass('Your\\Stuff\\YourAutoloadedClass');

                    expect(this.classAutoloader.autoloadClass).to.have.been.calledOnce;
                    expect(this.classAutoloader.autoloadClass).to.have.been.calledWith(
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
                    this.namespace.defineConstant('MY_CONST', this.valueFactory.createInteger(21));
                });

                it('should return its value', function () {
                    expect(this.namespace.getConstant('MY_CONST', true).getNative()).to.equal(21);
                });

                it('should not raise a notice', function () {
                    this.namespace.getConstant('MY_CONST', true);

                    expect(this.callStack.raiseError).not.to.have.been.called;
                });
            });

            describe('when the constant is not defined', function () {
                it('should raise an error', function () {
                    expect(function () {
                        this.namespace.getConstant('MY_UNDEFINED_CONST', true);
                    }.bind(this)).to.throw(
                        'Fake PHP Fatal error for #core.undefined_constant with {"name":"MY_UNDEFINED_CONST"}'
                    );
                });
            });
        });

        describe('when the constant is not within a namespace', function () {
            describe('when the constant is defined', function () {
                beforeEach(function () {
                    this.namespace.defineConstant('MY_CONST', this.valueFactory.createInteger(21));
                });

                it('should return its value', function () {
                    expect(this.namespace.getConstant('MY_CONST', false).getNative()).to.equal(21);
                });

                it('should not raise a warning', function () {
                    this.namespace.getConstant('MY_CONST', false);

                    expect(this.callStack.raiseError).not.to.have.been.called;
                });
            });

            describe('when the constant is not defined', function () {
                it('should return the constant\'s name as a string', function () {
                    var result = this.namespace.getConstant('MY_UNDEFINED_CONST', false);

                    expect(result.getType()).to.equal('string');
                    expect(result.getNative()).to.equal('MY_UNDEFINED_CONST');
                });

                it('should raise a warning', function () {
                    this.namespace.getConstant('MY_UNDEFINED_CONST', false);

                    expect(this.callStack.raiseError).to.have.been.calledOnce;
                    expect(this.callStack.raiseError).to.have.been.calledWith(
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
            this.createNamespace('MyNamespace');

            descendantNamespace = this.namespace.getDescendant('My\\Namespace\\Path');

            expect(this.namespace.getDescendant('mY\\NameSPACE\\PaTh')).to.equal(descendantNamespace);
        });

        it('should throw when the name given is empty', function () {
            expect(function () {
                this.namespace.getDescendant('');
            }.bind(this)).to.throw(
                'Namespace.getDescendant() :: Name cannot be empty'
            );
        });
    });

    describe('getFunction()', function () {
        beforeEach(function () {
            this.function = sinon.stub();
            this.createNamespace('My\\Stuff\\MyNamespace');
        });

        it('should simply return a native function if specified', function () {
            this.namespace.defineFunction('myFunction', this.function, this.namespaceScope);

            expect(this.namespace.getFunction(this.function)).to.equal(this.function);
        });

        it('should retrieve the function with correct case', function () {
            this.namespace.defineFunction('myFunction', this.function, this.namespaceScope);

            expect(this.namespace.getFunction('myFunction').testArgs.func).to.equal(this.function);
        });

        it('should retrieve the function case-insensitively', function () {
            this.namespace.defineFunction('myFunction', this.function, this.namespaceScope);

            expect(this.namespace.getFunction('MYFUNctioN').testArgs.func).to.equal(this.function);
        });

        it('should fall back to the global namespace if the function does not exist in this one', function () {
            var theFunction = sinon.stub();
            this.globalNamespace.defineFunction('thefunction', theFunction, this.namespaceScope);

            expect(this.namespace.getFunction('THEFunCTion').testArgs.func).to.equal(theFunction);
        });

        it('should allow functions in this namespace to override those in the global one', function () {
            var functionInGlobalSpace = sinon.stub(),
                functionInThisSpace = sinon.stub();
            this.globalNamespace.defineFunction('thefunction', functionInGlobalSpace, this.namespaceScope);
            this.namespace.defineFunction('theFunction', functionInThisSpace, this.namespaceScope);

            expect(this.namespace.getFunction('theFunction').testArgs.func).to.equal(functionInThisSpace);
        });

        it('should raise an error when the function is not defined in the current nor global namespaces', function () {
            expect(function () {
                this.namespace.getFunction('someUndefinedFunc');
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.call_to_undefined_function ' +
                'with {"name":"My\\\\Stuff\\\\MyNamespace\\\\someUndefinedFunc"}'
            );
        });
    });

    describe('getName()', function () {
        it('should return the name of the namespace prefixed with the parent\'s name', function () {
            this.createNamespace('The\\Parent\\Of\\MyNamespace');

            expect(this.namespace.getName()).to.equal('The\\Parent\\Of\\MyNamespace');
        });

        it('should return the empty string for the global namespace', function () {
            expect(this.globalNamespace.getName()).to.equal('');
        });
    });

    describe('getOwnFunction()', function () {
        beforeEach(function () {
            this.function = sinon.stub();
            this.createNamespace('MyNamespace');
        });

        it('should retrieve the function with correct case', function () {
            this.namespace.defineFunction('myFunction', this.function, this.namespaceScope);

            expect(this.namespace.getOwnFunction('myFunction').testArgs.func).to.equal(this.function);
        });

        it('should retrieve the function case-insensitively', function () {
            this.namespace.defineFunction('myFunction', this.function, this.namespaceScope);

            expect(this.namespace.getOwnFunction('MYFUNctioN').testArgs.func).to.equal(this.function);
        });

        it('should not fall back to the global namespace if the function does not exist in this one', function () {
            var theFunction = sinon.stub();
            this.globalNamespace.defineFunction('thefunction', theFunction, this.namespaceScope);

            expect(this.namespace.getOwnFunction('thefunction')).to.be.null;
        });
    });

    describe('getPrefix()', function () {
        it('should return the full path of the namespace suffixed with a backslash', function () {
            this.createNamespace('The\\Parent\\Of\\MyNamespace');

            expect(this.namespace.getPrefix()).to.equal('The\\Parent\\Of\\MyNamespace\\');
        });

        it('should return the empty string for the global namespace', function () {
            expect(this.globalNamespace.getPrefix()).to.equal('');
        });
    });

    describe('hasClass()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly detect an unqualified class from the global namespace', function () {
                this.namespace.defineClass('MyClass', function () {}, this.namespaceScope);

                expect(this.namespace.hasClass('MyClass')).to.be.true;
            });

            it('should correctly detect a class with name qualified by just a leading slash from the global namespace', function () {
                this.namespace.defineClass('MyClass', function () {}, this.namespaceScope);

                expect(this.namespace.hasClass('\\MyClass')).to.be.true;
            });

            it('should correctly detect a fully-qualified class from the relevant sub-namespace', function () {
                this.globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, this.namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                expect(this.namespace.hasClass('\\My\\Stuff\\MyClass')).to.be.true;
            });

            it('should correctly detect a relatively-qualified class from the relevant sub-namespace', function () {
                this.globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, this.namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                expect(this.namespace.hasClass('My\\Stuff\\MyClass')).to.be.true;
            });

            describe('for an undefined class', function () {
                it('should not invoke the autoloader', function () {
                    this.namespace.hasClass('My\\Lib\\MyAutoloadedClass');

                    expect(this.classAutoloader.autoloadClass).not.to.have.been.called;
                });

                it('should return false', function () {
                    expect(this.namespace.hasClass('My\\Lib\\MyAutoloadedClass')).to.be.false;
                });
            });
        });

        describe('when the current namespace is a sub-namespace', function () {
            beforeEach(function () {
                this.createNamespace('My\\Sub\\Space');
            });

            it('should correctly detect an unqualified class from the current namespace', function () {
                this.namespace.defineClass('MyClass', function () {}, this.namespaceScope);

                expect(this.namespace.hasClass('MyClass')).to.be.true;
            });

            it('should correctly detect a class with name qualified by just a leading slash from the global namespace', function () {
                this.globalNamespace.defineClass('MyClass', function () {}, this.namespaceScope);

                expect(this.namespace.hasClass('\\MyClass')).to.be.true;
            });

            it('should correctly detect a fully-qualified class from the relevant sub-namespace, relative to global', function () {
                this.globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, this.namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                expect(this.namespace.hasClass('\\My\\Stuff\\MyClass')).to.be.true;
            });

            it('should correctly detect a relatively-qualified class from the relevant sub-namespace, relative to current', function () {
                this.globalNamespace.getDescendant('My\\Sub\\Space\\Your\\Stuff')
                    .defineClass('YourClass', function () {}, this.namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                expect(this.namespace.hasClass('Your\\Stuff\\YourClass')).to.be.true;
            });

            describe('for an undefined class', function () {
                it('should not invoke the autoloader', function () {
                    this.namespace.hasClass('Your\\\\Stuff\\\\YourAutoloadedClass');

                    expect(this.classAutoloader.autoloadClass).not.to.have.been.called;
                });

                it('should return false', function () {
                    expect(this.namespace.hasClass('Your\\Stuff\\YourAutoloadedClass')).to.be.false;
                });
            });
        });
    });

    describe('hasConstant()', function () {
        it('should return true after a case-sensitive constant has been defined in the namespace', function () {
            this.createNamespace('MyNamespace');

            this.namespace.defineConstant('MY_CONST', 21);

            expect(this.namespace.hasConstant('MY_CONST')).to.be.true;
            expect(this.namespace.hasConstant('my_COnst')).to.be.false;
        });

        it('should return true after a case-insensitive constant has been defined in the namespace', function () {
            this.createNamespace('MyNamespace');

            this.namespace.defineConstant('ANOTHER_CONST', 21, {caseInsensitive: true});

            expect(this.namespace.hasConstant('ANOTHER_CONST')).to.be.true;
            expect(this.namespace.hasConstant('aNOther_consT')).to.be.true;
        });

        it('should return false for an undefined constant', function () {
            this.createNamespace('MyNamespace');

            this.namespace.defineConstant('SOME_CONST', 21);

            expect(this.namespace.hasConstant('A_DIFFERENT_CONST')).to.be.false;
        });
    });

    describe('hasFunction()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly detect an unqualified function from the global namespace', function () {
                this.namespace.defineFunction('myFunction', function () {}, this.namespaceScope);

                expect(this.namespace.hasFunction('myFunction')).to.be.true;
            });

            it('should correctly detect a function with name qualified by just a leading slash from the global namespace', function () {
                this.namespace.defineFunction('myFunction', function () {}, this.namespaceScope);

                expect(this.namespace.hasFunction('\\myFunction')).to.be.true;
            });

            it('should correctly detect a fully-qualified function from the relevant sub-namespace', function () {
                this.globalNamespace.getDescendant('My\\Stuff')
                    .defineFunction('myFunction', function () {}, this.namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                expect(this.namespace.hasFunction('\\My\\Stuff\\myFunction')).to.be.true;
            });

            it('should correctly detect a relatively-qualified function from the relevant sub-namespace', function () {
                this.globalNamespace.getDescendant('My\\Stuff')
                    .defineFunction('myFunction', function () {}, this.namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                expect(this.namespace.hasFunction('My\\Stuff\\myFunction')).to.be.true;
            });

            describe('for an undefined function', function () {
                it('should return false', function () {
                    expect(this.namespace.hasFunction('My\\Lib\\myFunction')).to.be.false;
                });
            });
        });

        describe('when the current namespace is a sub-namespace', function () {
            beforeEach(function () {
                this.createNamespace('My\\Sub\\Space');
            });

            it('should correctly detect an unqualified function from the current namespace', function () {
                this.namespace.defineFunction('myFunction', function () {}, this.namespaceScope);

                expect(this.namespace.hasFunction('myFunction')).to.be.true;
            });

            it('should correctly detect a function with name qualified by just a leading slash from the global namespace', function () {
                this.globalNamespace.defineFunction('myFunction', function () {}, this.namespaceScope);

                expect(this.namespace.hasFunction('\\myFunction')).to.be.true;
            });

            it('should correctly detect a fully-qualified function from the relevant sub-namespace, relative to global', function () {
                this.globalNamespace.getDescendant('My\\Stuff')
                    .defineFunction('myFunction', function () {}, this.namespaceScope);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                expect(this.namespace.hasFunction('\\My\\Stuff\\myFunction')).to.be.true;
            });

            it('should correctly detect a relatively-qualified function from the relevant sub-namespace, relative to current', function () {
                this.globalNamespace.getDescendant('My\\Sub\\Space\\Your\\Stuff')
                    .defineFunction('YourFunction', function () {}, this.namespaceScope);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                expect(this.namespace.hasFunction('Your\\Stuff\\YourFunction')).to.be.true;
            });

            describe('for an undefined function', function () {
                it('should return false', function () {
                    expect(this.namespace.hasFunction('Your\\Stuff\\YourFunction')).to.be.false;
                });
            });
        });
    });

    describe('parseName()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly resolve an unqualified name to the global namespace', function () {
                var parsed = this.namespace.parseName('MyName');

                expect(parsed.namespace).to.equal(this.globalNamespace);
                expect(parsed.name).to.equal('MyName');
            });

            it('should correctly resolve a name qualified by just a leading slash to the global namespace', function () {
                var parsed = this.namespace.parseName('\\MyName');

                expect(parsed.namespace).to.equal(this.globalNamespace);
                expect(parsed.name).to.equal('MyName');
            });

            it('should correctly resolve a fully-qualified name to the relevant sub-namespace', function () {
                var parsed,
                    subNamespace = this.globalNamespace.getDescendant('My\\Stuff');

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                parsed = this.namespace.parseName('\\My\\Stuff\\MyClass');

                expect(parsed.namespace).to.equal(subNamespace);
                expect(parsed.name).to.equal('MyClass');
            });

            it('should correctly resolve a relatively-qualified name to the relevant sub-namespace', function () {
                var parsed,
                    subNamespace = this.globalNamespace.getDescendant('My\\Stuff');

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                parsed = this.namespace.parseName('My\\Stuff\\MyClass');

                expect(parsed.namespace).to.equal(subNamespace);
                expect(parsed.name).to.equal('MyClass');
            });
        });

        describe('when the current namespace is a sub-namespace', function () {
            beforeEach(function () {
                this.createNamespace('My\\Sub\\Space');
            });

            it('should correctly resolve an unqualified name to the current namespace', function () {
                var parsed = this.namespace.parseName('MyName');

                expect(parsed.namespace).to.equal(this.namespace);
                expect(parsed.name).to.equal('MyName');
            });

            it('should correctly resolve a name qualified by just a leading slash to the global namespace', function () {
                var parsed = this.namespace.parseName('\\MyName');

                expect(parsed.namespace).to.equal(this.globalNamespace);
                expect(parsed.name).to.equal('MyName');
            });

            it('should correctly resolve a fully-qualified name to the relevant sub-namespace, relative to global', function () {
                var parsed,
                    subNamespace = this.globalNamespace.getDescendant('My\\Stuff');

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                parsed = this.namespace.parseName('\\My\\Stuff\\MyClass');

                expect(parsed.namespace).to.equal(subNamespace);
                expect(parsed.name).to.equal('MyClass');
            });

            it('should correctly resolve a relatively-qualified name to the relevant sub-namespace, relative to current', function () {
                var parsed,
                    subNamespace = this.globalNamespace.getDescendant('My\\Sub\\Space\\Your\\Stuff');

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                parsed = this.namespace.parseName('Your\\Stuff\\YourClass');

                expect(parsed.namespace).to.equal(subNamespace);
                expect(parsed.name).to.equal('YourClass');
            });
        });
    });
});
