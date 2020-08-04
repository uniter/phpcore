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
    Class = require('../../src/Class').sync(),
    Closure = require('../../src/Closure').sync(),
    DebugVariable = require('../../src/Debug/DebugVariable'),
    ElementReference = require('../../src/Reference/Element'),
    Environment = require('../../src/Environment'),
    Exception = phpCommon.Exception,
    KeyReferencePair = require('../../src/KeyReferencePair'),
    KeyValuePair = require('../../src/KeyValuePair'),
    List = require('../../src/List'),
    Loader = require('../../src/Loader').sync(),
    LoadFailedException = require('../../src/Exception/LoadFailedException'),
    LoadScope = require('../../src/LoadScope'),
    Module = require('../../src/Module'),
    Namespace = require('../../src/Namespace').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Reference = require('../../src/Reference/Reference'),
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    Scope = require('../../src/Scope').sync(),
    ScopeFactory = require('../../src/ScopeFactory'),
    StringValue = require('../../src/Value/String').sync(),
    Tools = require('../../src/Tools').sync(),
    Translator = phpCommon.Translator,
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Tools', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.currentScope = sinon.createStubInstance(Scope);
        this.environment = sinon.createStubInstance(Environment);
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.loader = sinon.createStubInstance(Loader);
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.referenceFactory = sinon.createStubInstance(ReferenceFactory);
        this.module = sinon.createStubInstance(Module);
        this.scopeFactory = sinon.createStubInstance(ScopeFactory);
        this.topLevelNamespaceScope = sinon.createStubInstance(NamespaceScope);
        this.topLevelScope = sinon.createStubInstance(Scope);
        this.translator = sinon.createStubInstance(Translator);
        this.valueFactory = new ValueFactory(null, this.callStack);

        this.callStack.raiseTranslatedError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, translationKey, placeholderVariables) {
                throw new Error(
                    'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
                );
            });
        this.topLevelNamespaceScope.getFilePath.returns('/path/to/my/module.php');
        this.translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });

        this.tools = new Tools(
            this.callStack,
            this.environment,
            this.translator,
            this.globalNamespace,
            this.loader,
            this.module,
            {}, // Options
            this.referenceFactory,
            this.scopeFactory,
            this.topLevelNamespaceScope,
            this.topLevelScope,
            this.valueFactory
        );
    });

    describe('createClosure()', function () {
        it('should return the created instance of Closure', function () {
            var closure = sinon.createStubInstance(Closure),
                closureClass = sinon.createStubInstance(Class),
                objectValue,
                wrappedFunction = function () {};
            closureClass.getName.returns('Closure');
            this.globalNamespace.getClass.withArgs('Closure').returns(closureClass);
            this.currentScope.createClosure
                .withArgs(
                    sinon.match.same(this.namespaceScope),
                    sinon.match.same(wrappedFunction)
                )
                .returns(closure);

            objectValue = this.tools.createClosure(wrappedFunction, this.currentScope, this.namespaceScope);

            expect(objectValue.getType()).to.equal('object');
            expect(objectValue.getClassName()).to.equal('Closure');
            expect(objectValue.getObject()).to.equal(closure);
        });
    });

    describe('createDebugVar()', function () {
        it('should return the created instance of DebugVariable', function () {
            expect(this.tools.createDebugVar(this.currentScope, 'myVar')).to.be.an.instanceOf(DebugVariable);
        });
    });

    describe('createInstance()', function () {
        it('should return an ObjectValue wrapping the created instance', function () {
            var argValue1 = this.valueFactory.createString('first arg'),
                argValue2 = this.valueFactory.createString('second arg'),
                classNameValue = sinon.createStubInstance(StringValue),
                instanceValue = sinon.createStubInstance(ObjectValue),
                namespaceScope = sinon.createStubInstance(NamespaceScope),
                result;
            classNameValue.instantiate
                .withArgs(
                    sinon.match([
                        sinon.match.same(argValue1),
                        sinon.match.same(argValue2)
                    ]),
                    sinon.match.same(namespaceScope)
                )
                .returns(instanceValue);

            result = this.tools.createInstance(namespaceScope, classNameValue, [argValue1, argValue2]);

            expect(result).to.equal(instanceValue);
        });
    });

    describe('createKeyReferencePair()', function () {
        it('should return the created instance of KeyReferencePair', function () {
            var keyValue = this.valueFactory.createString('my key'),
                result,
                reference = sinon.createStubInstance(Reference);

            result = this.tools.createKeyReferencePair(keyValue, reference);

            expect(result).to.be.an.instanceOf(KeyReferencePair);
            expect(result.getKey()).to.equal(keyValue);
            expect(result.getReference()).to.equal(reference);
        });
    });

    describe('createKeyValuePair()', function () {
        it('should return the created instance of KeyValuePair', function () {
            var keyValue = this.valueFactory.createString('my key'),
                result,
                valueValue = this.valueFactory.createString('my value');

            result = this.tools.createKeyValuePair(keyValue, valueValue);

            expect(result).to.be.an.instanceOf(KeyValuePair);
            expect(result.getKey()).to.equal(keyValue);
            expect(result.getValue()).to.equal(valueValue);
        });
    });

    describe('createList()', function () {
        it('should return a new List', function () {
            var element1 = sinon.createStubInstance(ElementReference),
                element2 = sinon.createStubInstance(ElementReference);

            expect(this.tools.createList([element1, element2])).to.be.an.instanceOf(List);
        });
    });

    describe('createNamespaceScope()', function () {
        it('should return a correctly created new NamespaceScope', function () {
            var namespace = sinon.createStubInstance(Namespace),
                namespaceScope = sinon.createStubInstance(NamespaceScope);
            this.scopeFactory.createNamespaceScope
                .withArgs(
                    sinon.match.same(namespace),
                    sinon.match.same(this.globalNamespace),
                    sinon.match.same(this.module)
                )
                .returns(namespaceScope);

            expect(this.tools.createNamespaceScope(namespace)).to.equal(namespaceScope);
        });
    });

    describe('eval()', function () {
        describe('when no "eval" option has been specified', function () {
            it('should throw', function () {
                expect(function () {
                    this.tools.eval('<?php some_code();');
                }.bind(this)).to.throw(Exception, 'eval(...) :: No "eval" interpreter option is available.');
            });
        });

        describe('when the "eval" option has been specified', function () {
            beforeEach(function () {
                this.evalOption = sinon.stub();
                this.evalScope = sinon.createStubInstance(Scope);
                this.tools = new Tools(
                    this.callStack,
                    this.environment,
                    this.translator,
                    this.globalNamespace,
                    this.loader,
                    this.module,
                    {
                        // Options
                        'eval': this.evalOption
                    },
                    this.referenceFactory,
                    this.scopeFactory,
                    this.topLevelNamespaceScope,
                    this.topLevelScope,
                    this.valueFactory
                );

                this.topLevelNamespaceScope.getFilePath.returns('/path/to/my/parent/module.php');
                this.callStack.getLastLine.returns(123);
            });

            it('should invoke the Loader with the "eval" type', function () {
                this.tools.eval('some_code()', this.evalScope);

                expect(this.loader.load).to.have.been.calledWith('eval');
            });

            it('should invoke the Loader with the correct special path string when the line number is available', function () {
                this.tools.eval('some_code()', this.evalScope);

                expect(this.loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    '[Translated] core.eval_path {"path":"/path/to/my/parent/module.php","lineNumber":123}'
                );
            });

            it('should invoke the Loader with the correct special path string when the line number is unavailable', function () {
                this.callStack.getLastLine.returns(null);

                this.tools.eval('some_code()', this.evalScope);

                expect(this.loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    '[Translated] core.eval_path {"path":"/path/to/my/parent/module.php","lineNumber":"[Translated] core.unknown {}"}'
                );
            });

            it('should invoke the Loader with the current options', function () {
                this.tools.eval('some_code()', this.evalScope);

                expect(this.loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    {
                        'eval': sinon.match.same(this.evalOption)
                    }
                );
            });

            it('should invoke the Loader with the Environment', function () {
                this.tools.eval('some_code()', this.evalScope);

                expect(this.loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(this.environment)
                );
            });

            it('should invoke the Loader with the current Module', function () {
                this.tools.eval('some_code()', this.evalScope);

                expect(this.loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(this.module)
                );
            });

            it('should invoke the Loader with a correctly created Eval LoadScope', function () {
                var evalLoadScope = sinon.createStubInstance(LoadScope);
                this.scopeFactory.createLoadScope
                    .withArgs(sinon.match.same(this.evalScope), '/path/to/my/parent/module.php', 'eval')
                    .returns(evalLoadScope);

                this.tools.eval('some_code()', this.evalScope);

                expect(this.loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(evalLoadScope)
                );
            });

            it('should provide the Loader with a load function that calls the "eval" option correctly', function () {
                var loadFunction,
                    promise = {},
                    resultValue = this.valueFactory.createString('my eval\'d module result');
                this.evalOption
                    .withArgs(
                        '<?php some_code();',
                        '/path/to/my/parent/module.php : eval()\'d code',
                        sinon.match.same(promise),
                        '/path/to/my/parent/module.php',
                        sinon.match.same(this.valueFactory)
                    )
                    .returns(resultValue);
                this.tools.eval('some_code();', this.evalScope);

                loadFunction = this.loader.load.args[0][6];

                expect(loadFunction).to.be.a('function');
                expect(
                    loadFunction(
                        '/path/to/my/parent/module.php : eval()\'d code',
                        promise,
                        '/path/to/my/parent/module.php',
                        this.valueFactory
                    )
                ).to.equal(resultValue);
            });

            it('should return the result from the Loader', function () {
                var resultValue = this.valueFactory.createString('my eval\'d module result');
                this.loader.load.returns(resultValue);

                expect(this.tools.eval('some_code()', this.evalScope)).to.equal(resultValue);
            });
        });
    });

    describe('exit()', function () {
        it('should throw an ExitValue created with the given status value', function () {
            var caughtError,
                statusValue = this.valueFactory.createInteger(4);

            try {
                this.tools.exit(statusValue);
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError.getType()).to.equal('exit');
            expect(caughtError.getStatus()).to.equal(4);
        });
    });

    describe('getClassName()', function () {
        it('should return the name of the provided class wrapped as a StringValue', function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue;
            classObject.getName.returns('My\\Namespaced\\HandyClass');

            resultValue = this.tools.getClassName(classObject);

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('My\\Namespaced\\HandyClass');
        });
    });

    describe('getNormalizedPath()', function () {
        it('should return "(program)" when no module path was provided', function () {
            this.topLevelNamespaceScope.getFilePath.returns(null);

            expect(this.tools.getNormalizedPath()).to.equal('(program)');
        });

        it('should return the path when a module path was provided', function () {
            expect(this.tools.getNormalizedPath()).to.equal('/path/to/my/module.php');
        });
    });

    describe('getParentClassName()', function () {
        it('should return the FQCN of the parent class when class has one, as a wrapped string value', function () {
            var classObject = sinon.createStubInstance(Class),
                parentClassObject = sinon.createStubInstance(Class),
                value;
            classObject.getSuperClass.returns(parentClassObject);
            parentClassObject.getName.returns('My\\Fqcn\\OfMy\\ParentClass');

            value = this.tools.getParentClassName(classObject);

            expect(value.getType()).to.equal('string');
            expect(value.getNative()).to.equal('My\\Fqcn\\OfMy\\ParentClass');
        });

        it('should raise an error when the class has no parent', function () {
            var classObject = sinon.createStubInstance(Class);
            classObject.getSuperClass.returns(null);

            expect(function () {
                this.tools.getParentClassName(classObject);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.no_parent_class with {}'
            );
        });
    });

    describe('getPathDirectory()', function () {
        it('should return "" when no module path was provided', function () {
            this.topLevelNamespaceScope.getFilePath.returns(null);

            expect(this.tools.getPathDirectory().getNative()).to.equal('');
        });

        it('should return the parent path for a script inside a subfolder', function () {
            var tools = new Tools(
                this.callStack,
                this.environment,
                this.translator,
                this.globalNamespace,
                this.loader,
                this.module,
                {}, // Options
                this.referenceFactory,
                this.scopeFactory,
                this.topLevelNamespaceScope,
                this.topLevelScope,
                this.valueFactory
            );
            this.topLevelNamespaceScope.getFilePath.returns('/my/path/to/my_script.php');

            expect(tools.getPathDirectory().getNative()).to.equal('/my/path/to');
        });

        it('should return "" for a script in the root directory with no leading slash', function () {
            var tools = new Tools(
                this.callStack,
                this.environment,
                this.translator,
                this.globalNamespace,
                this.loader,
                this.module,
                {}, // Options
                this.referenceFactory,
                this.scopeFactory,
                this.topLevelNamespaceScope,
                this.topLevelScope,
                this.valueFactory
            );
            this.topLevelNamespaceScope.getFilePath.returns('my_script.php');

            expect(tools.getPathDirectory().getNative()).to.equal('');
        });

        it('should return "" for a script in the root directory with a leading slash', function () {
            var tools = new Tools(
                this.callStack,
                this.environment,
                this.translator,
                this.globalNamespace,
                this.loader,
                this.module,
                {}, // Options
                this.referenceFactory,
                this.scopeFactory,
                this.topLevelNamespaceScope,
                this.topLevelScope,
                this.valueFactory
            );
            this.topLevelNamespaceScope.getFilePath.returns('/my_script.php');

            expect(tools.getPathDirectory().getNative()).to.equal('');
        });
    });

    describe('include()', function () {
        describe('when no "include" option has been specified', function () {
            it('should throw', function () {
                expect(function () {
                    this.tools.include('/some/path/to/my_included_module.php');
                }.bind(this)).to.throw(
                    Exception,
                    'include(/some/path/to/my_included_module.php) :: No "include" transport option is available for loading the module.'
                );
            });
        });

        describe('when the "include" option has been specified', function () {
            beforeEach(function () {
                this.includeOption = sinon.stub();
                this.includeScope = sinon.createStubInstance(Scope);
                this.tools = new Tools(
                    this.callStack,
                    this.environment,
                    this.translator,
                    this.globalNamespace,
                    this.loader,
                    this.module,
                    {
                        // Options
                        'include': this.includeOption
                    },
                    this.referenceFactory,
                    this.scopeFactory,
                    this.topLevelNamespaceScope,
                    this.topLevelScope,
                    this.valueFactory
                );

                this.topLevelNamespaceScope.getFilePath.returns('/path/to/my/parent/module.php');
                this.callStack.getLastLine.returns(123);
            });

            it('should invoke the Loader with the "include" type', function () {
                this.tools.include('/some/path/to/my_included_module.php', this.includeScope);

                expect(this.loader.load).to.have.been.calledWith('include');
            });

            it('should invoke the Loader with the correct included path string', function () {
                this.tools.include('/some/path/to/my_included_module.php', this.includeScope);

                expect(this.loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    '/some/path/to/my_included_module.php'
                );
            });

            it('should invoke the Loader with the current options', function () {
                this.tools.include('/some/path/to/my_included_module.php', this.includeScope);

                expect(this.loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    {
                        'include': sinon.match.same(this.includeOption)
                    }
                );
            });

            it('should invoke the Loader with the Environment', function () {
                this.tools.include('/some/path/to/my_included_module.php', this.includeScope);

                expect(this.loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(this.environment)
                );
            });

            it('should invoke the Loader with the current Module', function () {
                this.tools.include('/some/path/to/my_included_module.php', this.includeScope);

                expect(this.loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(this.module)
                );
            });

            it('should invoke the Loader with a correctly created IncludeScope', function () {
                var includeLoadScope = sinon.createStubInstance(LoadScope);
                this.scopeFactory.createLoadScope
                    .withArgs(sinon.match.same(this.includeScope), '/path/to/my/parent/module.php', 'include')
                    .returns(includeLoadScope);

                this.tools.include('/some/path/to/my_included_module.php', this.includeScope);

                expect(this.loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(includeLoadScope)
                );
            });

            it('should provide the Loader with a load function that calls the "include" option correctly', function () {
                var loadFunction,
                    promise = {},
                    resultValue = this.valueFactory.createString('my include\'d module result');
                this.includeOption
                    .withArgs(
                        '/some/path/to/my_included_module.php',
                        sinon.match.same(promise),
                        '/path/to/my/parent/module.php',
                        sinon.match.same(this.valueFactory)
                    )
                    .returns(resultValue);
                this.tools.include('/some/path/to/my_included_module.php', this.includeScope);

                loadFunction = this.loader.load.args[0][6];

                expect(loadFunction).to.be.a('function');
                expect(
                    loadFunction(
                        '/some/path/to/my_included_module.php',
                        promise,
                        '/path/to/my/parent/module.php',
                        this.valueFactory
                    )
                ).to.equal(resultValue);
            });

            it('should return the result from the Loader', function () {
                var resultValue = this.valueFactory.createString('my include\'d module result');
                this.loader.load.returns(resultValue);

                expect(this.tools.include('/some/path/to/my_included_module.php', this.includeScope))
                    .to.equal(resultValue);
            });

            it('should return bool(false) on LoadFailedException', function () {
                this.loader.load.throws(new LoadFailedException(new Error('Oh dear')));

                expect(this.tools.include('/some/path/to/my_included_module.php', this.includeScope).getNative())
                    .to.be.false;
            });

            it('should not catch any other type of error', function () {
                this.loader.load.throws(new Error('Bang!'));

                expect(function () {
                    this.tools.include('/some/path/to/my_included_module.php', this.includeScope);
                }.bind(this)).to.throw('Bang!');
            });
        });
    });

    describe('tick()', function () {
        describe('when no "tick" option has been specified', function () {
            it('should throw', function () {
                expect(function () {
                    this.tools.tick(21, 4, 22, 10);
                }.bind(this)).to.throw(Exception, 'tick(...) :: No "tick" handler option is available.');
            });
        });

        describe('when the "tick" option has been specified', function () {
            beforeEach(function () {
                this.tickOption = sinon.stub();
                this.tools = new Tools(
                    this.callStack,
                    this.environment,
                    this.translator,
                    this.globalNamespace,
                    this.loader,
                    this.module,
                    {
                        // Options
                        'tick': this.tickOption
                    },
                    this.referenceFactory,
                    this.scopeFactory,
                    this.topLevelNamespaceScope,
                    this.topLevelScope,
                    this.valueFactory
                );
            });

            it('should call the tick handler with the full statement information', function () {
                this.tools.tick(21, 4, 22, 10);

                expect(this.tickOption).to.have.been.calledOnce;
                expect(this.tickOption).to.have.been.calledWith('/path/to/my/module.php', 21, 4, 22, 10);
                expect(this.tickOption).to.have.been.calledOn(null);
            });
        });
    });
});
