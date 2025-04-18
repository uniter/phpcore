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
    tools = require('./tools'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    ClassAutoloader = require('../../src/ClassAutoloader').sync(),
    ClassDefiner = require('../../src/OOP/Class/ClassDefiner'),
    ExportRepository = require('../../src/FFI/Export/ExportRepository'),
    FFIFactory = require('../../src/FFI/FFIFactory'),
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    FunctionSpec = require('../../src/Function/FunctionSpec'),
    FunctionSpecFactory = require('../../src/Function/FunctionSpecFactory'),
    Namespace = require('../../src/Namespace').sync(),
    NamespaceFactory = require('../../src/NamespaceFactory'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    OverloadedFunctionDefiner = require('../../src/Function/Overloaded/OverloadedFunctionDefiner'),
    OverloadedFunctionVariant = require('../../src/Function/Overloaded/OverloadedFunctionVariant'),
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError,
    Trait = require('../../src/OOP/Trait/Trait'),
    TraitDefiner = require('../../src/OOP/Trait/TraitDefiner');

describe('Namespace', function () {
    var callStack,
        classAutoloader,
        classDefiner,
        createNamespace,
        exportRepository,
        ffiFactory,
        flow,
        functionFactory,
        functionSpecFactory,
        futureFactory,
        globalNamespace,
        namespace,
        namespaceFactory,
        namespaceScope,
        overloadedFunctionDefiner,
        state,
        traitDefiner,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        callStack = sinon.createStubInstance(CallStack);
        classAutoloader = sinon.createStubInstance(ClassAutoloader);
        classDefiner = sinon.createStubInstance(ClassDefiner);
        exportRepository = sinon.createStubInstance(ExportRepository);
        ffiFactory = sinon.createStubInstance(FFIFactory);
        flow = state.getFlow();
        functionFactory = sinon.createStubInstance(FunctionFactory);
        functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
        futureFactory = state.getFutureFactory();
        namespaceFactory = sinon.createStubInstance(NamespaceFactory);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        overloadedFunctionDefiner = sinon.createStubInstance(OverloadedFunctionDefiner);
        traitDefiner = sinon.createStubInstance(TraitDefiner);
        valueFactory = state.getValueFactory();

        callStack.getLastFilePath.returns('/path/to/my_module.php');
        namespaceScope.hasClass.returns(false);
        namespaceScope.hasTrait.returns(false);
        namespaceScope.isNameInUse.returns(false);

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

        classDefiner.defineClass.callsFake(function (
            name,
            definition,
            namespace
        ) {
            var classObject = sinon.createStubInstance(Class);

            classObject.getName.returns(namespace.getPrefix() + name);

            return futureFactory.createPresent(classObject);
        });

        traitDefiner.defineTrait.callsFake(function (
            name,
            definition,
            namespace
        ) {
            var traitObject = sinon.createStubInstance(Trait);

            traitObject.getName.returns(namespace.getPrefix() + name);

            return futureFactory.createPresent(traitObject);
        });

        functionFactory.create.callsFake(function (namespace, currentClass, currentObject, staticClass, functionSpec) {
            var wrapperFunc = sinon.stub();
            wrapperFunc.testArgs = {
                namespace: namespace,
                currentClass: currentClass,
                currentObject: currentObject,
                functionSpec: functionSpec,
                staticClass: staticClass
            };
            return wrapperFunc;
        });

        namespaceFactory.create.callsFake(function (parentNamespace, name) {
            return new Namespace(
                callStack,
                flow,
                valueFactory,
                namespaceFactory,
                functionFactory,
                functionSpecFactory,
                overloadedFunctionDefiner,
                classAutoloader,
                classDefiner,
                traitDefiner,
                parentNamespace || null,
                name || ''
            );
        });

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
                    sinon.match.same(originalFunction),
                    {my: 'return type'},
                    true,
                    '/path/to/my_module.php',
                    123
                )
                .returns(functionSpec);
            functionFactory.create
                .withArgs(
                    sinon.match.same(namespaceScope),
                    null,
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
                {my: 'return type'},
                true,
                123
            );
            wrappedFunction.functionSpec = functionSpec;
            wrappedFunction.originalFunc = originalFunction;
            functionSpec.createAliasFunction
                .withArgs(
                    'myAliasFunc',
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
        it('should raise an uncatchable fatal error when the class is already defined', async function () {
            await namespace.defineClass('MyClass', function () {}, namespaceScope).toPromise();
            namespaceScope.hasClass
                .withArgs('MyClass')
                .returns(true);
            namespaceScope.isNameInUse
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
                .returns(false);
            namespaceScope.isNameInUse
                .withArgs('MyClass')
                .returns(true);

            expect(function () {
                namespace.defineClass('MyClass', function () {}, namespaceScope);
            }).to.throw(
                PHPFatalError,
                // NB: This is not quite the same translation as above: "cannot_declare..." vs. "cannot_redeclare...".
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_declare_class_as_name_already_in_use ' +
                'with {"className":"MyClass"} in /path/to/my_module.php on line 1234'
            );
        });

        it('should invoke the ClassDefiner correctly when no custom method caller is given', async function () {
            var definition = {
                    interfaces: ['Throwable'],
                    properties: {},
                    methods: []
                };

            await namespace.defineClass('MyInvalidThrowable', definition, namespaceScope, true).toPromise();

            expect(classDefiner.defineClass).to.have.been.calledOnce;
            expect(classDefiner.defineClass).to.have.been.calledWith(
                'MyInvalidThrowable',
                sinon.match.same(definition),
                sinon.match.same(namespace),
                sinon.match.same(namespaceScope),
                true, // Auto-coercion enabled.
                null // Note it should be null and not undefined.
            );
        });

        it('should invoke the ClassDefiner correctly when a custom method caller is given', async function () {
            var definition = {
                    interfaces: ['Throwable'],
                    properties: {},
                    methods: []
                },
                methodCaller = sinon.stub();

            await namespace.defineClass('MyInvalidThrowable', definition, namespaceScope, true, methodCaller).toPromise();

            expect(classDefiner.defineClass).to.have.been.calledOnce;
            expect(classDefiner.defineClass).to.have.been.calledWith(
                'MyInvalidThrowable',
                sinon.match.same(definition),
                sinon.match.same(namespace),
                sinon.match.same(namespaceScope),
                true, // Auto-coercion enabled.
                sinon.match.same(methodCaller)
            );
        });

        it('should not raise an uncatchable fatal error when a PHP-defined class attempts to implement an interface named Throwable from a non-global namespace', function () {
            namespaceScope.resolveName
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
                    sinon.match.same(originalFunction),
                    {my: 'return type'},
                    false,
                    '/path/to/my_module.php',
                    123
                )
                .returns(functionSpec);
            functionFactory.create
                .withArgs(
                    sinon.match.same(namespaceScope),
                    null,
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
                {my: 'return type'},
                false,
                123
            );

            expect(namespace.getFunction('myFunction')).to.equal(wrappedFunction);
        });

        it('should raise an uncatchable fatal error when the function is already defined in userland with same case', function () {
            var functionSpec = sinon.createStubInstance(FunctionSpec),
                originalFunction = sinon.stub(),
                parametersSpecData = [{name: 'param1'}, {name: 'param2'}],
                wrappedFunction = sinon.stub();
            functionSpec.getFilePath.returns('/my/module.php');
            functionSpec.getLineNumber.returns(321);
            functionSpec.isBuiltin.returns(false);
            wrappedFunction.functionSpec = functionSpec;
            callStack.getLastFilePath.returns('/path/to/my_module.php');
            functionSpecFactory.createFunctionSpec
                .withArgs(
                    sinon.match.same(namespaceScope),
                    'myFunction',
                    parametersSpecData,
                    sinon.match.same(originalFunction),
                    {my: 'return type'},
                    false,
                    '/path/to/my_module.php',
                    123
                )
                .returns(functionSpec);
            functionFactory.create
                .withArgs(
                    sinon.match.same(namespaceScope),
                    null,
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
                {my: 'return type'},
                false,
                123
            );

            expect(function () {
                namespace.defineFunction(
                    'myFunction',
                    originalFunction,
                    namespaceScope,
                    parametersSpecData,
                    {my: 'return type'},
                    false,
                    123
                );
            }).to.throw(
                PHPFatalError,
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_redeclare_userland_function ' +
                'with {"functionName":"myFunction","originalFile":"/my/module.php","originalLine":321} ' +
                'in /path/to/my_module.php on line 1234'
            );
        });

        it('should raise an uncatchable fatal error when the function is already defined in userland with different case', function () {
            var functionSpec = sinon.createStubInstance(FunctionSpec),
                originalFunction = sinon.stub(),
                parametersSpecData = [{name: 'param1'}, {name: 'param2'}],
                wrappedFunction = sinon.stub();
            functionSpec.getFilePath.returns('/my/module.php');
            functionSpec.getLineNumber.returns(321);
            functionSpec.isBuiltin.returns(false);
            wrappedFunction.functionSpec = functionSpec;
            callStack.getLastFilePath.returns('/path/to/my_module.php');
            functionSpecFactory.createFunctionSpec
                .withArgs(
                    sinon.match.same(namespaceScope),
                    'myFUNCtion',
                    parametersSpecData,
                    sinon.match.same(originalFunction),
                    {my: 'return type'},
                    false,
                    '/path/to/my_module.php',
                    123
                )
                .returns(functionSpec);
            functionFactory.create
                .withArgs(
                    sinon.match.same(namespaceScope),
                    null,
                    null,
                    null,
                    sinon.match.same(functionSpec)
                )
                .returns(wrappedFunction);
            namespace.defineFunction(
                'myFUNCtion', // Use a different case.
                originalFunction,
                namespaceScope,
                parametersSpecData,
                {my: 'return type'},
                false,
                123
            );

            expect(function () {
                namespace.defineFunction(
                    'myFunction',
                    originalFunction,
                    namespaceScope,
                    parametersSpecData,
                    {my: 'return type'},
                    false,
                    123
                );
            }).to.throw(
                PHPFatalError,
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_redeclare_userland_function ' +
                'with {"functionName":"myFunction","originalFile":"/my/module.php","originalLine":321} ' +
                'in /path/to/my_module.php on line 1234'
            );
        });

        it('should raise an uncatchable fatal error when the function is already defined as a builtin with different case', function () {
            var functionSpec = sinon.createStubInstance(FunctionSpec),
                originalFunction = sinon.stub(),
                parametersSpecData = [{name: 'param1'}, {name: 'param2'}],
                wrappedFunction = sinon.stub();
            functionSpec.isBuiltin.returns(true);
            wrappedFunction.functionSpec = functionSpec;
            callStack.getLastFilePath.returns('/path/to/my_module.php');
            functionSpecFactory.createFunctionSpec
                .withArgs(
                    sinon.match.same(namespaceScope),
                    'myFUNCtion',
                    parametersSpecData,
                    sinon.match.same(originalFunction),
                    {my: 'return type'},
                    false,
                    '/path/to/my_module.php',
                    123
                )
                .returns(functionSpec);
            functionFactory.create
                .withArgs(
                    sinon.match.same(namespaceScope),
                    null,
                    null,
                    null,
                    sinon.match.same(functionSpec)
                )
                .returns(wrappedFunction);
            namespace.defineFunction(
                'myFUNCtion', // Use a different case.
                originalFunction,
                namespaceScope,
                parametersSpecData,
                {my: 'return type'},
                false,
                123
            );

            expect(function () {
                namespace.defineFunction(
                    'myFunction',
                    originalFunction,
                    namespaceScope,
                    parametersSpecData,
                    {my: 'return type'},
                    false,
                    123
                );
            }).to.throw(
                PHPFatalError,
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_redeclare_builtin_function ' +
                'with {"functionName":"myFunction"} in /path/to/my_module.php on line 1234'
            );
        });
    });

    describe('defineOverloadedFunction()', function () {
        it('should correctly define the function via OverloadedFunctionDefiner', function () {
            var variant1 = sinon.createStubInstance(OverloadedFunctionVariant),
                variant2 = sinon.createStubInstance(OverloadedFunctionVariant),
                wrappedFunction = sinon.stub();
            overloadedFunctionDefiner.defineFunction
                .withArgs(
                    'myFunction',
                    [sinon.match.same(variant1), sinon.match.same(variant2)],
                    sinon.match.same(namespaceScope)
                )
                .returns(wrappedFunction);

            namespace.defineOverloadedFunction(
                'myFunction',
                [variant1, variant2],
                namespaceScope
            );

            expect(namespace.getFunction('myFunction')).to.equal(wrappedFunction);
        });

        it('should raise an uncatchable fatal error when the function is already defined with same case', function () {
            var functionSpec = sinon.createStubInstance(FunctionSpec),
                variant1 = sinon.createStubInstance(OverloadedFunctionVariant),
                variant2 = sinon.createStubInstance(OverloadedFunctionVariant),
                wrappedFunction = sinon.stub();
            functionSpec.isBuiltin.returns(true);
            wrappedFunction.functionSpec = functionSpec;
            overloadedFunctionDefiner.defineFunction
                .withArgs(
                    'myFunction',
                    [sinon.match.same(variant1), sinon.match.same(variant2)],
                    sinon.match.same(namespaceScope)
                )
                .returns(wrappedFunction);
            namespace.defineOverloadedFunction(
                'myFunction',
                [variant1, variant2],
                namespaceScope
            );

            expect(function () {
                namespace.defineOverloadedFunction(
                    'myFunction',
                    [variant1, variant2],
                    namespaceScope
                );
            }).to.throw(
                PHPFatalError,
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_redeclare_builtin_function ' +
                'with {"functionName":"myFunction"} in /path/to/my_module.php on line 1234'
            );
        });

        it('should raise an uncatchable fatal error when the function is already defined with different case', function () {
            var functionSpec = sinon.createStubInstance(FunctionSpec),
                variant1 = sinon.createStubInstance(OverloadedFunctionVariant),
                variant2 = sinon.createStubInstance(OverloadedFunctionVariant),
                wrappedFunction = sinon.stub();
            functionSpec.isBuiltin.returns(true);
            wrappedFunction.functionSpec = functionSpec;
            overloadedFunctionDefiner.defineFunction
                .withArgs(
                    'myFUNCtion',
                    [sinon.match.same(variant1), sinon.match.same(variant2)],
                    sinon.match.same(namespaceScope)
                )
                .returns(wrappedFunction);
            namespace.defineOverloadedFunction(
                'myFUNCtion', // Use a different case.
                [variant1, variant2],
                namespaceScope
            );

            expect(function () {
                namespace.defineOverloadedFunction(
                    'myFunction',
                    [variant1, variant2],
                    namespaceScope
                );
            }).to.throw(
                PHPFatalError,
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_redeclare_builtin_function ' +
                'with {"functionName":"myFunction"} in /path/to/my_module.php on line 1234'
            );
        });
    });

    describe('defineTrait()', function () {
        it('should raise an uncatchable fatal error when the trait is already defined', async function () {
            await namespace.defineTrait('MyTrait', function () {}, namespaceScope).toPromise();
            namespaceScope.hasTrait
                .withArgs('MyTrait')
                .returns(true);
            namespaceScope.isNameInUse
                .withArgs('MyTrait')
                .returns(true);

            expect(function () {
                namespace.defineTrait(
                    'MyTrait',
                    {},
                    namespaceScope
                );
            }).to.throw(
                PHPFatalError,
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_redeclare_trait_as_name_already_in_use ' +
                'with {"traitName":"MyTrait"} in /path/to/my_module.php on line 1234'
            );
        });

        it('should raise an uncatchable fatal error when the name is already used by an import', function () {
            namespaceScope.hasTrait
                .withArgs('MyTrait')
                .returns(false);
            namespaceScope.isNameInUse
                .withArgs('MyTrait')
                .returns(true);

            expect(function () {
                namespace.defineTrait('MyTrait', {}, namespaceScope);
            }).to.throw(
                PHPFatalError,
                // NB: This is not quite the same translation as above: "cannot_declare..." vs. "cannot_redeclare...".
                'PHP Fatal error: Fake uncatchable fatal error for #core.cannot_declare_trait_as_name_already_in_use ' +
                'with {"traitName":"MyTrait"} in /path/to/my_module.php on line 1234'
            );
        });

        it('should invoke the TraitDefiner correctly when no auto-coercion is enabled', async function () {
            var definition = {
                    properties: {},
                    methods: []
                };

            await namespace.defineTrait('MyTrait', definition, namespaceScope, false).toPromise();

            expect(traitDefiner.defineTrait).to.have.been.calledOnce;
            expect(traitDefiner.defineTrait).to.have.been.calledWith(
                'MyTrait',
                sinon.match.same(definition),
                sinon.match.same(namespace),
                sinon.match.same(namespaceScope),
                false
            );
        });

        it('should invoke the TraitDefiner correctly when auto-coercion is enabled', async function () {
            var definition = {
                    properties: {},
                    methods: []
                };

            await namespace.defineTrait('MyTrait', definition, namespaceScope, true).toPromise();

            expect(traitDefiner.defineTrait).to.have.been.calledOnce;
            expect(traitDefiner.defineTrait).to.have.been.calledWith(
                'MyTrait',
                sinon.match.same(definition),
                sinon.match.same(namespace),
                sinon.match.same(namespaceScope),
                true
            );
        });
    });

    describe('getClass()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly fetch an unqualified class name from the global namespace', async function () {
                var classObject;
                await namespace.defineClass('MyClass', function () {}, namespaceScope).toPromise();

                classObject = await namespace.getClass('MyClass').toPromise();

                expect(classObject.getName()).to.equal('MyClass');
            });

            it('should correctly fetch a class name qualified by just a leading slash from the global namespace', async function () {
                var classObject;
                await namespace.defineClass('MyClass', function () {}, namespaceScope).toPromise();

                classObject = await namespace.getClass('\\MyClass').toPromise();

                expect(classObject.getName()).to.equal('MyClass');
            });

            it('should correctly fetch a fully-qualified class name from the relevant sub-namespace', async function () {
                var classObject;
                await globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope)
                    .toPromise();

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                classObject = await namespace.getClass('\\My\\Stuff\\MyClass').toPromise();

                expect(classObject.getName()).to.equal('My\\Stuff\\MyClass');
            });

            it('should correctly fetch a relatively-qualified class name from the relevant sub-namespace', async function () {
                var classObject;
                await globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope)
                    .toPromise();

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                classObject = await namespace.getClass('My\\Stuff\\MyClass').toPromise();

                expect(classObject.getName()).to.equal('My\\Stuff\\MyClass');
            });

            describe('for an undefined class being successfully autoloaded', function () {
                beforeEach(function () {
                    // Fake a successful autoloading
                    classAutoloader.autoloadClass.callsFake(function () {
                        return globalNamespace.getDescendant('My\\Lib')
                            .defineClass('MyAutoloadedClass', function () {}, namespaceScope);
                    });
                });

                it('should invoke the autoloader correctly', async function () {
                    await namespace.getClass('My\\Lib\\MyAutoloadedClass').toPromise();

                    expect(classAutoloader.autoloadClass).to.have.been.calledOnce;
                    expect(classAutoloader.autoloadClass).to.have.been.calledWith('My\\Lib\\MyAutoloadedClass');
                });

                it('should return the autoloaded class', async function () {
                    var classObject = await namespace.getClass('My\\Lib\\MyAutoloadedClass').toPromise();

                    expect(classObject.getName()).to.equal('My\\Lib\\MyAutoloadedClass');
                });

                it('should not raise any error', function () {
                    return expect(namespace.getClass('My\\Lib\\MyAutoloadedClass').toPromise()).not.to.be.rejected;
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
                    return expect(namespace.getClass('My\\Lib\\MyAutoloadedClass').toPromise()).to.eventually.be.rejectedWith(
                        'Fake PHP Fatal error for #core.class_not_found with {"name":"My\\\\Lib\\\\MyAutoloadedClass"}'
                    );
                });
            });
        });

        describe('when the current namespace is a sub-namespace', function () {
            beforeEach(function () {
                createNamespace('My\\Sub\\Space');
            });

            it('should correctly fetch an unqualified name from the current namespace', async function () {
                var classObject;
                await namespace.defineClass('MyClass', function () {}, namespaceScope).toPromise();

                classObject = await namespace.getClass('MyClass').toPromise();

                expect(classObject.getName()).to.equal('My\\Sub\\Space\\MyClass');
            });

            it('should correctly fetch a name qualified by just a leading slash from the global namespace', async function () {
                var classObject;
                await globalNamespace.defineClass('MyClass', function () {}, namespaceScope).toPromise();

                classObject = await namespace.getClass('\\MyClass').toPromise();

                expect(classObject.getName()).to.equal('MyClass');
            });

            it('should correctly fetch a fully-qualified name from the relevant sub-namespace, relative to global', async function () {
                var classObject;
                await globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope)
                    .toPromise();

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                classObject = await namespace.getClass('\\My\\Stuff\\MyClass').toPromise();

                expect(classObject.getName()).to.equal('My\\Stuff\\MyClass');
            });

            it('should correctly fetch a relatively-qualified name from the relevant sub-namespace, relative to current', async function () {
                var classObject;
                await globalNamespace.getDescendant('My\\Sub\\Space\\Your\\Stuff')
                    .defineClass('YourClass', function () {}, namespaceScope)
                    .toPromise();

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified
                classObject = await namespace.getClass('Your\\Stuff\\YourClass').toPromise();

                expect(classObject.getName()).to.equal('My\\Sub\\Space\\Your\\Stuff\\YourClass');
            });

            describe('for an undefined class being successfully autoloaded', function () {
                beforeEach(function () {
                    // Fake a successful autoloading
                    classAutoloader.autoloadClass.callsFake(function () {
                        return namespace.getDescendant('Your\\Stuff')
                            .defineClass('YourAutoloadedClass', function () {}, namespaceScope);
                    });
                });

                it('should invoke the autoloader correctly', async function () {
                    await namespace.getClass('Your\\Stuff\\YourAutoloadedClass').toPromise();

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

            functionSpecFactory.createFunctionSpec.callsFake(function (namespaceScope, name, parametersSpecData, func) {
                var functionSpec = sinon.createStubInstance(FunctionSpec);

                functionSpec.getFunction.returns(func);
                functionSpec.getName.returns(name);

                return functionSpec;
            });

            createNamespace('My\\Stuff\\MyNamespace');
        });

        it('should simply return a native function if specified', function () {
            namespace.defineFunction('myFunction', func, namespaceScope);

            expect(namespace.getFunction(func)).to.equal(func);
        });

        it('should retrieve the function with correct case', function () {
            namespace.defineFunction('myFunction', func, namespaceScope);

            expect(namespace.getFunction('myFunction').testArgs.functionSpec.getFunction()).to.equal(func);
        });

        it('should retrieve the function case-insensitively', function () {
            namespace.defineFunction('myFunction', func, namespaceScope);

            expect(namespace.getFunction('MYFUNctioN').testArgs.functionSpec.getFunction()).to.equal(func);
        });

        it('should fall back to the global namespace if the function does not exist in this one', function () {
            var theFunction = sinon.stub();
            globalNamespace.defineFunction('thefunction', theFunction, namespaceScope);

            expect(namespace.getFunction('THEFunCTion').testArgs.functionSpec.getFunction()).to.equal(theFunction);
        });

        it('should allow functions in this namespace to override those in the global one', function () {
            var functionInGlobalSpace = sinon.stub(),
                functionInThisSpace = sinon.stub();
            globalNamespace.defineFunction('thefunction', functionInGlobalSpace, namespaceScope);
            namespace.defineFunction('theFunction', functionInThisSpace, namespaceScope);

            expect(namespace.getFunction('theFunction').testArgs.functionSpec.getFunction())
                .to.equal(functionInThisSpace);
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

            functionSpecFactory.createFunctionSpec.callsFake(function (namespaceScope, name, parametersSpecData, func) {
                var functionSpec = sinon.createStubInstance(FunctionSpec);

                functionSpec.getFunction.returns(func);
                functionSpec.getName.returns(name);

                return functionSpec;
            });

            createNamespace('MyNamespace');
        });

        it('should retrieve the function with correct case', function () {
            namespace.defineFunction('myFunction', func, namespaceScope);

            expect(namespace.getOwnFunction('myFunction').testArgs.functionSpec.getFunction()).to.equal(func);
        });

        it('should retrieve the function case-insensitively', function () {
            namespace.defineFunction('myFunction', func, namespaceScope);

            expect(namespace.getOwnFunction('MYFUNctioN').testArgs.functionSpec.getFunction()).to.equal(func);
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

    describe('getTrait()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly fetch an unqualified trait name from the global namespace', async function () {
                var traitObject;
                await namespace.defineTrait('MyTrait', function () {}, namespaceScope).toPromise();

                traitObject = await namespace.getTrait('MyTrait').toPromise();

                expect(traitObject.getName()).to.equal('MyTrait');
            });

            it('should correctly fetch a trait name qualified by just a leading slash from the global namespace', async function () {
                var traitObject;
                await namespace.defineTrait('MyTrait', function () {}, namespaceScope).toPromise();

                traitObject = await namespace.getTrait('\\MyTrait').toPromise();

                expect(traitObject.getName()).to.equal('MyTrait');
            });

            it('should correctly fetch a fully-qualified trait name from the relevant sub-namespace', async function () {
                var traitObject;
                await globalNamespace.getDescendant('My\\Stuff')
                    .defineTrait('MyTrait', function () {}, namespaceScope)
                    .toPromise();

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified.
                traitObject = await namespace.getTrait('\\My\\Stuff\\MyTrait').toPromise();

                expect(traitObject.getName()).to.equal('My\\Stuff\\MyTrait');
            });

            it('should correctly fetch a relatively-qualified trait name from the relevant sub-namespace', async function () {
                var traitObject;
                await globalNamespace.getDescendant('My\\Stuff')
                    .defineTrait('MyTrait', function () {}, namespaceScope)
                    .toPromise();

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified.
                traitObject = await namespace.getTrait('My\\Stuff\\MyTrait').toPromise();

                expect(traitObject.getName()).to.equal('My\\Stuff\\MyTrait');
            });

            describe('for an undefined trait being successfully autoloaded', function () {
                beforeEach(function () {
                    // Fake a successful autoloading.
                    classAutoloader.autoloadClass.callsFake(function () {
                        return globalNamespace.getDescendant('My\\Lib')
                            .defineTrait('MyAutoloadedTrait', function () {}, namespaceScope);
                    });
                });

                it('should invoke the autoloader correctly', async function () {
                    await namespace.getTrait('My\\Lib\\MyAutoloadedTrait').toPromise();

                    expect(classAutoloader.autoloadClass).to.have.been.calledOnce;
                    expect(classAutoloader.autoloadClass).to.have.been.calledWith('My\\Lib\\MyAutoloadedTrait');
                });

                it('should return the autoloaded trait', async function () {
                    var traitObject = await namespace.getTrait('My\\Lib\\MyAutoloadedTrait').toPromise();

                    expect(traitObject.getName()).to.equal('My\\Lib\\MyAutoloadedTrait');
                });

                it('should not raise any error', function () {
                    return expect(namespace.getTrait('My\\Lib\\MyAutoloadedTrait').toPromise()).not.to.be.rejected;
                });
            });

            describe('for an undefined trait that is not successfully autoloaded', function () {
                it('should invoke the autoloader correctly', function () {
                    try {
                        namespace.getTrait('My\\Lib\\MyAutoloadedTrait');
                    } catch (e) {}

                    expect(classAutoloader.autoloadClass).to.have.been.calledOnce;
                    expect(classAutoloader.autoloadClass).to.have.been.calledWith('My\\Lib\\MyAutoloadedTrait');
                });

                it('should raise a "trait not found" error', function () {
                    return expect(namespace.getTrait('My\\Lib\\MyAutoloadedTrait').toPromise()).to.eventually.be.rejectedWith(
                        'Fake PHP Fatal error for #core.trait_not_found with {"name":"My\\\\Lib\\\\MyAutoloadedTrait"}'
                    );
                });
            });
        });
    });

    describe('hasClass()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly detect an unqualified class from the global namespace', async function () {
                await namespace.defineClass('MyClass', function () {}, namespaceScope).toPromise();

                expect(namespace.hasClass('MyClass')).to.be.true;
            });

            it('should correctly detect a class with name qualified by just a leading slash from the global namespace', async function () {
                await namespace.defineClass('MyClass', function () {}, namespaceScope).toPromise();

                expect(namespace.hasClass('\\MyClass')).to.be.true;
            });

            it('should correctly detect a fully-qualified class from the relevant sub-namespace', async function () {
                await globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope)
                    .toPromise();

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified
                expect(namespace.hasClass('\\My\\Stuff\\MyClass')).to.be.true;
            });

            it('should correctly detect a relatively-qualified class from the relevant sub-namespace', async function () {
                await globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope)
                    .toPromise();

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

            it('should correctly detect an unqualified class from the current namespace', async function () {
                await namespace.defineClass('MyClass', function () {}, namespaceScope).toPromise();

                expect(namespace.hasClass('MyClass')).to.be.true;
            });

            it('should correctly detect a class with name qualified by just a leading slash from the global namespace', async function () {
                await globalNamespace.defineClass('MyClass', function () {}, namespaceScope).toPromise();

                expect(namespace.hasClass('\\MyClass')).to.be.true;
            });

            it('should correctly detect a fully-qualified class from the relevant sub-namespace, relative to global', async function () {
                await globalNamespace.getDescendant('My\\Stuff')
                    .defineClass('MyClass', function () {}, namespaceScope)
                    .toPromise();

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified.
                expect(namespace.hasClass('\\My\\Stuff\\MyClass')).to.be.true;
            });

            it('should correctly fetch a relatively-qualified class from the relevant sub-namespace, relative to current', async function () {
                await globalNamespace.getDescendant('My\\Sub\\Space\\Your\\Stuff')
                    .defineClass('YourClass', function () {}, namespaceScope)
                    .toPromise();

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified.
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

    describe('hasTrait()', function () {
        describe('when the current namespace is the global namespace', function () {
            it('should correctly detect an unqualified trait from the global namespace', async function () {
                await namespace.defineTrait('MyTrait', function () {}, namespaceScope).toPromise();
                namespaceScope.hasTrait
                    .withArgs('MyTrait')
                    .returns(true);

                expect(namespace.hasTrait('MyTrait')).to.be.true;
            });

            it('should correctly detect a trait with name qualified by just a leading slash from the global namespace', async function () {
                await namespace.defineTrait('MyTrait', function () {}, namespaceScope).toPromise();
                namespaceScope.hasTrait
                    .withArgs('MyTrait')
                    .returns(true);

                expect(namespace.hasTrait('\\MyTrait')).to.be.true;
            });

            it('should correctly detect a fully-qualified trait from the relevant sub-namespace', async function () {
                await globalNamespace.getDescendant('My\\Stuff')
                    .defineTrait('MyTrait', function () {}, namespaceScope)
                    .toPromise();
                namespaceScope.hasTrait
                    .withArgs('My\\Stuff\\MyTrait')
                    .returns(true);

                // NB: Unlike the test below, this one has a leading slash to make it fully-qualified.
                expect(namespace.hasTrait('\\My\\Stuff\\MyTrait')).to.be.true;
            });

            it('should correctly detect a relatively-qualified trait from the relevant sub-namespace', async function () {
                await globalNamespace.getDescendant('My\\Stuff')
                    .defineTrait('MyTrait', function () {}, namespaceScope)
                    .toPromise();
                namespaceScope.hasTrait
                    .withArgs('My\\Stuff\\MyTrait')
                    .returns(true);

                // NB: Unlike the test above, this one has no leading slash to make it relatively-qualified.
                expect(namespace.hasTrait('My\\Stuff\\MyTrait')).to.be.true;
            });

            describe('for an undefined trait', function () {
                it('should not invoke the autoloader', function () {
                    namespaceScope.hasTrait
                        .withArgs('My\\Lib\\MyAutoloadedTrait')
                        .returns(false);

                    namespace.hasTrait('My\\Lib\\MyAutoloadedTrait');

                    expect(classAutoloader.autoloadClass).not.to.have.been.called;
                });

                it('should return false', function () {
                    namespaceScope.hasTrait
                        .withArgs('My\\Lib\\MyAutoloadedTrait')
                        .returns(false);

                    expect(namespace.hasTrait('My\\Lib\\MyAutoloadedTrait')).to.be.false;
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
