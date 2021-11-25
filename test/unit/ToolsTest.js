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
    Includer = require('../../src/Load/Includer').sync(),
    KeyReferencePair = require('../../src/KeyReferencePair'),
    KeyValuePair = require('../../src/KeyValuePair'),
    List = require('../../src/List'),
    Loader = require('../../src/Load/Loader').sync(),
    LoadScope = require('../../src/Load/LoadScope'),
    Module = require('../../src/Module'),
    Namespace = require('../../src/Namespace').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    OnceIncluder = require('../../src/Load/OnceIncluder').sync(),
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
    var callStack,
        currentScope,
        environment,
        globalNamespace,
        includer,
        loader,
        module,
        namespaceScope,
        onceIncluder,
        referenceFactory,
        scopeFactory,
        tools,
        topLevelNamespaceScope,
        topLevelScope,
        translator,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        currentScope = sinon.createStubInstance(Scope);
        environment = sinon.createStubInstance(Environment);
        globalNamespace = sinon.createStubInstance(Namespace);
        includer = sinon.createStubInstance(Includer);
        loader = sinon.createStubInstance(Loader);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        onceIncluder = sinon.createStubInstance(OnceIncluder);
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        module = sinon.createStubInstance(Module);
        scopeFactory = sinon.createStubInstance(ScopeFactory);
        topLevelNamespaceScope = sinon.createStubInstance(NamespaceScope);
        topLevelScope = sinon.createStubInstance(Scope);
        translator = sinon.createStubInstance(Translator);
        valueFactory = new ValueFactory(null, callStack);

        callStack.raiseTranslatedError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, translationKey, placeholderVariables) {
                throw new Error(
                    'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
                );
            });
        topLevelNamespaceScope.getFilePath.returns('/path/to/my/module.php');
        translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });
        valueFactory.setGlobalNamespace(globalNamespace);

        tools = new Tools(
            callStack,
            environment,
            translator,
            globalNamespace,
            loader,
            includer,
            onceIncluder,
            module,
            {my: 'options'}, // Options
            referenceFactory,
            scopeFactory,
            topLevelNamespaceScope,
            topLevelScope,
            valueFactory
        );
    });

    describe('createClosure()', function () {
        it('should return the created instance of Closure', function () {
            var closure = sinon.createStubInstance(Closure),
                closureClass = sinon.createStubInstance(Class),
                objectValue = sinon.createStubInstance(ObjectValue),
                wrappedFunction = function () {};
            closureClass.getName.returns('Closure');
            closureClass.instantiateWithInternals
                .withArgs([], {closure: sinon.match.same(closure)})
                .returns(objectValue);
            globalNamespace.getClass.withArgs('Closure').returns(closureClass);
            currentScope.createClosure
                .withArgs(
                    sinon.match.same(namespaceScope),
                    sinon.match.same(wrappedFunction)
                )
                .returns(closure);

            expect(tools.createClosure(wrappedFunction, currentScope, namespaceScope))
                .to.equal(objectValue);
        });
    });

    describe('createDebugVar()', function () {
        it('should return the created instance of DebugVariable', function () {
            expect(tools.createDebugVar(currentScope, 'myVar')).to.be.an.instanceOf(DebugVariable);
        });
    });

    describe('createInstance()', function () {
        it('should return an ObjectValue wrapping the created instance', function () {
            var argValue1 = valueFactory.createString('first arg'),
                argValue2 = valueFactory.createString('second arg'),
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

            result = tools.createInstance(namespaceScope, classNameValue, [argValue1, argValue2]);

            expect(result).to.equal(instanceValue);
        });
    });

    describe('createKeyReferencePair()', function () {
        it('should return the created instance of KeyReferencePair', function () {
            var keyValue = valueFactory.createString('my key'),
                result,
                reference = sinon.createStubInstance(Reference);

            result = tools.createKeyReferencePair(keyValue, reference);

            expect(result).to.be.an.instanceOf(KeyReferencePair);
            expect(result.getKey()).to.equal(keyValue);
            expect(result.getReference()).to.equal(reference);
        });
    });

    describe('createKeyValuePair()', function () {
        it('should return the created instance of KeyValuePair', function () {
            var keyValue = valueFactory.createString('my key'),
                result,
                valueValue = valueFactory.createString('my value');

            result = tools.createKeyValuePair(keyValue, valueValue);

            expect(result).to.be.an.instanceOf(KeyValuePair);
            expect(result.getKey()).to.equal(keyValue);
            expect(result.getValue()).to.equal(valueValue);
        });
    });

    describe('createList()', function () {
        it('should return a new List', function () {
            var element1 = sinon.createStubInstance(ElementReference),
                element2 = sinon.createStubInstance(ElementReference);

            expect(tools.createList([element1, element2])).to.be.an.instanceOf(List);
        });
    });

    describe('createNamespaceScope()', function () {
        it('should return a correctly created new NamespaceScope', function () {
            var namespace = sinon.createStubInstance(Namespace),
                namespaceScope = sinon.createStubInstance(NamespaceScope);
            scopeFactory.createNamespaceScope
                .withArgs(
                    sinon.match.same(namespace),
                    sinon.match.same(module)
                )
                .returns(namespaceScope);

            expect(tools.createNamespaceScope(namespace)).to.equal(namespaceScope);
        });
    });

    describe('eval()', function () {
        describe('when no "eval" option has been specified', function () {
            it('should throw', function () {
                expect(function () {
                    tools.eval('<?php some_code();');
                }).to.throw(Exception, 'eval(...) :: No "eval" interpreter option is available.');
            });
        });

        describe('when the "eval" option has been specified', function () {
            var evalOption,
                evalScope;

            beforeEach(function () {
                evalOption = sinon.stub();
                evalScope = sinon.createStubInstance(Scope);
                tools = new Tools(
                    callStack,
                    environment,
                    translator,
                    globalNamespace,
                    loader,
                    includer,
                    onceIncluder,
                    module,
                    {
                        // Options
                        'eval': evalOption
                    },
                    referenceFactory,
                    scopeFactory,
                    topLevelNamespaceScope,
                    topLevelScope,
                    valueFactory
                );

                topLevelNamespaceScope.getFilePath.returns('/path/to/my/parent/module.php');
                callStack.getLastLine.returns(123);
            });

            it('should invoke the Loader with the "eval" type', function () {
                tools.eval('some_code()', evalScope);

                expect(loader.load).to.have.been.calledWith('eval');
            });

            it('should invoke the Loader with the correct special path string when the line number is available', function () {
                tools.eval('some_code()', evalScope);

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    '[Translated] core.eval_path {"path":"/path/to/my/parent/module.php","lineNumber":123}'
                );
            });

            it('should invoke the Loader with the correct special path string when the line number is unavailable', function () {
                callStack.getLastLine.returns(null);

                tools.eval('some_code()', evalScope);

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    '[Translated] core.eval_path {"path":"/path/to/my/parent/module.php","lineNumber":"[Translated] core.unknown {}"}'
                );
            });

            it('should invoke the Loader with the current options', function () {
                tools.eval('some_code()', evalScope);

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    {
                        'eval': sinon.match.same(evalOption)
                    }
                );
            });

            it('should invoke the Loader with the Environment', function () {
                tools.eval('some_code()', evalScope);

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(environment)
                );
            });

            it('should invoke the Loader with the current Module', function () {
                tools.eval('some_code()', evalScope);

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(module)
                );
            });

            it('should invoke the Loader with a correctly created Eval LoadScope', function () {
                var evalLoadScope = sinon.createStubInstance(LoadScope);
                scopeFactory.createLoadScope
                    .withArgs(sinon.match.same(evalScope), '/path/to/my/parent/module.php', 'eval')
                    .returns(evalLoadScope);

                tools.eval('some_code()', evalScope);

                expect(loader.load).to.have.been.calledWith(
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
                    resultValue = valueFactory.createString('my eval\'d module result');
                evalOption
                    .withArgs(
                        '<?php some_code();',
                        '/path/to/my/parent/module.php : eval()\'d code',
                        sinon.match.same(promise),
                        '/path/to/my/parent/module.php',
                        sinon.match.same(valueFactory)
                    )
                    .returns(resultValue);
                tools.eval('some_code();', evalScope);

                loadFunction = loader.load.args[0][6];

                expect(loadFunction).to.be.a('function');
                expect(
                    loadFunction(
                        '/path/to/my/parent/module.php : eval()\'d code',
                        promise,
                        '/path/to/my/parent/module.php',
                        valueFactory
                    )
                ).to.equal(resultValue);
            });

            it('should return the result from the Loader', function () {
                var resultValue = valueFactory.createString('my eval\'d module result');
                loader.load.returns(resultValue);

                expect(tools.eval('some_code()', evalScope)).to.equal(resultValue);
            });
        });
    });

    describe('exit()', function () {
        it('should throw an ExitValue created with the given status value', function () {
            var caughtError,
                statusValue = valueFactory.createInteger(4);

            try {
                tools.exit(statusValue);
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

            resultValue = tools.getClassName(classObject);

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('My\\Namespaced\\HandyClass');
        });
    });

    describe('getNormalizedPath()', function () {
        it('should return "(program)" when no module path was provided', function () {
            topLevelNamespaceScope.getFilePath.returns(null);

            expect(tools.getNormalizedPath()).to.equal('(program)');
        });

        it('should return the path when a module path was provided', function () {
            expect(tools.getNormalizedPath()).to.equal('/path/to/my/module.php');
        });
    });

    describe('getParentClassName()', function () {
        it('should return the FQCN of the parent class when class has one, as a wrapped string value', function () {
            var classObject = sinon.createStubInstance(Class),
                parentClassObject = sinon.createStubInstance(Class),
                value;
            classObject.getSuperClass.returns(parentClassObject);
            parentClassObject.getName.returns('My\\Fqcn\\OfMy\\ParentClass');

            value = tools.getParentClassName(classObject);

            expect(value.getType()).to.equal('string');
            expect(value.getNative()).to.equal('My\\Fqcn\\OfMy\\ParentClass');
        });

        it('should raise an error when the class has no parent', function () {
            var classObject = sinon.createStubInstance(Class);
            classObject.getSuperClass.returns(null);

            expect(function () {
                tools.getParentClassName(classObject);
            }).to.throw(
                'Fake PHP Fatal error for #core.no_parent_class with {}'
            );
        });
    });

    describe('getPathDirectory()', function () {
        it('should return "" when no module path was provided', function () {
            topLevelNamespaceScope.getFilePath.returns(null);

            expect(tools.getPathDirectory().getNative()).to.equal('');
        });

        it('should return the parent path for a script inside a subfolder', function () {
            var tools = new Tools(
                callStack,
                environment,
                translator,
                globalNamespace,
                loader,
                includer,
                onceIncluder,
                module,
                {}, // Options
                referenceFactory,
                scopeFactory,
                topLevelNamespaceScope,
                topLevelScope,
                valueFactory
            );
            topLevelNamespaceScope.getFilePath.returns('/my/path/to/my_script.php');

            expect(tools.getPathDirectory().getNative()).to.equal('/my/path/to');
        });

        it('should return "" for a script in the root directory with no leading slash', function () {
            var tools = new Tools(
                callStack,
                environment,
                translator,
                globalNamespace,
                loader,
                includer,
                onceIncluder,
                module,
                {}, // Options
                referenceFactory,
                scopeFactory,
                topLevelNamespaceScope,
                topLevelScope,
                valueFactory
            );
            topLevelNamespaceScope.getFilePath.returns('my_script.php');

            expect(tools.getPathDirectory().getNative()).to.equal('');
        });

        it('should return "" for a script in the root directory with a leading slash', function () {
            var tools = new Tools(
                callStack,
                environment,
                translator,
                globalNamespace,
                loader,
                includer,
                onceIncluder,
                module,
                {}, // Options
                referenceFactory,
                scopeFactory,
                topLevelNamespaceScope,
                topLevelScope,
                valueFactory
            );
            topLevelNamespaceScope.getFilePath.returns('/my_script.php');

            expect(tools.getPathDirectory().getNative()).to.equal('');
        });
    });

    describe('includeOnce()', function () {
        it('should return the result of including via the OnceIncluder', function () {
            var enclosingScope = sinon.createStubInstance(Scope),
                resultValue = valueFactory.createString('my result');
            onceIncluder.includeOnce
                .withArgs(
                    'include_once',
                    PHPError.E_WARNING, // For includes, only a warning is raised on failure
                    sinon.match.same(environment),
                    sinon.match.same(module),
                    sinon.match.same(topLevelNamespaceScope),
                    '/my/included_path.php',
                    sinon.match.same(enclosingScope),
                    {my: 'options'}
                )
                .returns(resultValue);

            expect(tools.includeOnce('/my/included_path.php', enclosingScope)).to.equal(resultValue);
        });
    });

    describe('include()', function () {
        it('should return the result of including via the Includer', function () {
            var enclosingScope = sinon.createStubInstance(Scope),
                resultValue = valueFactory.createString('my result');
            includer.include
                .withArgs(
                    'include',
                    PHPError.E_WARNING, // For includes, only a warning is raised on failure
                    sinon.match.same(environment),
                    sinon.match.same(module),
                    sinon.match.same(topLevelNamespaceScope),
                    '/my/included_path.php',
                    sinon.match.same(enclosingScope),
                    {my: 'options'}
                )
                .returns(resultValue);

            expect(tools.include('/my/included_path.php', enclosingScope)).to.equal(resultValue);
        });
    });

    describe('requireOnce()', function () {
        it('should return the result of requiring via the OnceIncluder', function () {
            var enclosingScope = sinon.createStubInstance(Scope),
                resultValue = valueFactory.createString('my result');
            onceIncluder.includeOnce
                .withArgs(
                    'require_once',
                    PHPError.E_ERROR, // For requires, a fatal error is raised on failure
                    sinon.match.same(environment),
                    sinon.match.same(module),
                    sinon.match.same(topLevelNamespaceScope),
                    '/my/required_path.php',
                    sinon.match.same(enclosingScope),
                    {my: 'options'}
                )
                .returns(resultValue);

            expect(tools.requireOnce('/my/required_path.php', enclosingScope)).to.equal(resultValue);
        });
    });

    describe('require()', function () {
        it('should return the result of including via the Includer', function () {
            var enclosingScope = sinon.createStubInstance(Scope),
                resultValue = valueFactory.createString('my result');
            includer.include
                .withArgs(
                    'require',
                    PHPError.E_ERROR, // For requires, a fatal error is raised on failure
                    sinon.match.same(environment),
                    sinon.match.same(module),
                    sinon.match.same(topLevelNamespaceScope),
                    '/my/required_path.php',
                    sinon.match.same(enclosingScope),
                    {my: 'options'}
                )
                .returns(resultValue);

            expect(tools.require('/my/required_path.php', enclosingScope)).to.equal(resultValue);
        });
    });

    describe('tick()', function () {
        describe('when no "tick" option has been specified', function () {
            it('should throw', function () {
                expect(function () {
                    tools.tick(21, 4, 22, 10);
                }).to.throw(Exception, 'tick(...) :: No "tick" handler option is available.');
            });
        });

        describe('when the "tick" option has been specified', function () {
            var tickOption;

            beforeEach(function () {
                tickOption = sinon.stub();
                tools = new Tools(
                    callStack,
                    environment,
                    translator,
                    globalNamespace,
                    loader,
                    includer,
                    onceIncluder,
                    module,
                    {
                        // Options
                        'tick': tickOption
                    },
                    referenceFactory,
                    scopeFactory,
                    topLevelNamespaceScope,
                    topLevelScope,
                    valueFactory
                );
            });

            it('should call the tick handler with the full statement information', function () {
                tools.tick(21, 4, 22, 10);

                expect(tickOption).to.have.been.calledOnce;
                expect(tickOption).to.have.been.calledWith('/path/to/my/module.php', 21, 4, 22, 10);
                expect(tickOption).to.have.been.calledOn(null);
            });
        });
    });
});
