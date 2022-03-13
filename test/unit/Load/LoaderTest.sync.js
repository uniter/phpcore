/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    expect = require('chai').expect,
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    tools = require('../tools'),
    Class = require('../../../src/Class').sync(),
    Engine = require('../../../src/Engine'),
    Environment = require('../../../src/Environment'),
    Exception = phpCommon.Exception,
    Loader = require('../../../src/Load/Loader').sync(),
    LoadFailedException = require('../../../src/Exception/LoadFailedException'),
    Module = require('../../../src/Module'),
    Namespace = require('../../../src/Namespace').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPFatalError = phpCommon.PHPFatalError,
    PHPParseError = phpCommon.PHPParseError,
    Scope = require('../../../src/Scope').sync(),
    Value = require('../../../src/Value').sync();

describe('Loader (sync mode)', function () {
    var elements,
        enclosingScope,
        environment,
        futureFactory,
        globalNamespace,
        module,
        state,
        subEngine,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('sync');
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();
        elements = [];
        enclosingScope = sinon.createStubInstance(Scope);
        environment = sinon.createStubInstance(Environment);
        globalNamespace = sinon.createStubInstance(Namespace);
        module = sinon.createStubInstance(Module);
        subEngine = sinon.createStubInstance(Engine);

        valueFactory.setGlobalNamespace(globalNamespace);

        module.getFilePath.returns('/path/to/my/current/module.php');
    });

    describe('load()', function () {
        var loadCallback,
            loader,
            moduleFactoryFunction;

        beforeEach(function () {
            loadCallback = sinon.spy(function (path, promise) {
                moduleFactoryFunction = sinon.stub();
                moduleFactoryFunction.returns(subEngine);

                promise.resolve(moduleFactoryFunction);
            });
            loader = new Loader(valueFactory, 'sync');

            subEngine.execute.returns(valueFactory.createString('my sync module result'));
        });

        it('should return the result resolved by the load callback', async function () {
            var resultValue = await loader.load(
                'include',
                '/path/to/my/module.php',
                {},
                environment,
                module,
                enclosingScope,
                loadCallback
            ).toPromise();

            expect(resultValue).to.be.an.instanceOf(Value);
            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('my sync module result');
        });

        it('should pass the path to the resource being loaded to the load callback', async function () {
            await loader.load(
                'include',
                '/path/to/my/module.php',
                {},
                environment,
                module,
                enclosingScope,
                loadCallback
            ).toPromise();

            expect(loadCallback).to.have.been.calledOnce;
            expect(loadCallback).to.have.been.calledWith('/path/to/my/module.php');
        });

        it('should pass the path to the current module performing the load to the load callback', async function () {
            await loader.load(
                'include',
                '/path/to/my/module.php',
                {},
                environment,
                module,
                enclosingScope,
                loadCallback
            ).toPromise();

            expect(loadCallback).to.have.been.calledOnce;
            expect(loadCallback).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                '/path/to/my/current/module.php'
            );
        });

        it('should pass the path to the ValueFactory to the load callback', async function () {
            await loader.load(
                'include',
                '/path/to/my/module.php',
                {},
                environment,
                module,
                enclosingScope,
                loadCallback
            ).toPromise();

            expect(loadCallback).to.have.been.calledOnce;
            expect(loadCallback).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(valueFactory)
            );
        });

        it('should pass the sub module options to the module factory function', async function () {
            await loader.load(
                'include',
                '/path/to/my/module.php',
                {
                    myExtraOption: 21
                },
                environment,
                module,
                enclosingScope,
                loadCallback
            ).toPromise();

            expect(moduleFactoryFunction).to.have.been.calledOnce;
            expect(moduleFactoryFunction).to.have.been.calledWith(sinon.match({
                myExtraOption: 21
            }));
        });

        it('should normalise the file path passed to the module factory function', async function () {
            await loader.load(
                'include',
                // Ensure the same-dir and parent-dir symbols here are normalised below
                '/path/./to/../my/module.php',
                {},
                environment,
                module,
                enclosingScope,
                loadCallback
            ).toPromise();

            expect(moduleFactoryFunction).to.have.been.calledOnce;
            expect(moduleFactoryFunction).to.have.been.calledWith(sinon.match({
                // Ensure the same-dir and parent-dir symbols above are normalised
                path: '/path/my/module.php'
            }));
        });

        it('should pass the Environment to the module factory function', async function () {
            await loader.load(
                'include',
                '/path/to/my/module.php',
                {
                    myExtraOption: 21
                },
                environment,
                module,
                enclosingScope,
                loadCallback
            ).toPromise();

            expect(moduleFactoryFunction).to.have.been.calledOnce;
            expect(moduleFactoryFunction).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(environment)
            );
        });

        it('should pass the enclosing Scope to the module factory function', async function () {
            await loader.load(
                'include',
                '/path/to/my/module.php',
                {
                    myExtraOption: 21
                },
                environment,
                module,
                enclosingScope,
                loadCallback
            ).toPromise();

            expect(moduleFactoryFunction).to.have.been.calledOnce;
            expect(moduleFactoryFunction).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(enclosingScope)
            );
        });

        it('should use a Value returned by the load callback as the module\'s returned value', async function () {
            var resultValue = await loader.load(
                'include',
                '/path/to/my/module.php',
                {},
                environment,
                module,
                enclosingScope,
                function (path, promise) {
                    promise.resolve(valueFactory.createString('my fixed module result'));
                }
            ).toPromise();

            expect(resultValue).to.be.an.instanceOf(Value);
            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('my fixed module result');
        });

        it('should throw an error with the error when the load callback rejects with a normal JS error', function () {
            expect(function () {
                loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    environment,
                    module,
                    enclosingScope,
                    function (path, promise) {
                        promise.reject(new Error('There was some issue with the include'));
                    }
                ).yieldSync();
            }).to.throw(LoadFailedException, 'Load failed :: There was some issue with the include');
        });

        it('should throw an instance of ParseError when the load callback throws a PHPParseError', function () {
            var caughtError,
                parseErrorClassObject = sinon.createStubInstance(Class),
                parseErrorObjectValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass.withArgs('ParseError')
                .returns(futureFactory.createPresent(parseErrorClassObject));
            parseErrorClassObject.instantiate.returns(parseErrorObjectValue);

            try {
                loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    environment,
                    module,
                    enclosingScope,
                    function (path, promise) {
                        promise.reject(
                            new PHPParseError('There was a problem parsing', '/path/to/my_module.php', 123)
                        );
                    }
                ).yieldSync();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).to.equal(parseErrorObjectValue);
            expect(parseErrorClassObject.instantiate.args[0][0][0].getType()).to.equal('string');
            expect(parseErrorClassObject.instantiate.args[0][0][0].getNative())
                .to.equal('There was a problem parsing');
        });

        it('should rethrow when the load callback throws a PHPFatalError', function () {
            var fatalError = new PHPFatalError('Oh dear', '/path/to/my/broken/module.php', 4444);

            expect(function () {
                loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    environment,
                    module,
                    enclosingScope,
                    function (path, promise) {
                        promise.reject(fatalError);
                    }
                ).yieldSync();
            }).to.throw(fatalError);
        });

        it('should rethrow when the load callback throws a value', function () {
            var caughtError,
                throwableClassObject = sinon.createStubInstance(Class),
                thrownObjectValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass.withArgs('MyThrowable')
                .returns(futureFactory.createPresent(throwableClassObject));
            throwableClassObject.instantiate.returns(thrownObjectValue);

            try {
                loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    environment,
                    module,
                    enclosingScope,
                    function (path, promise) {
                        promise.reject(thrownObjectValue);
                    }
                ).yieldSync();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).to.equal(thrownObjectValue);
        });

        it('should rethrow when the load callback throws a special ExitValue', function () {
            var caughtError,
                thrownExitValue = valueFactory.createExit();

            try {
                loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    environment,
                    module,
                    enclosingScope,
                    function (path, promise) {
                        promise.reject(thrownExitValue);
                    }
                ).yieldSync();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).to.equal(thrownExitValue);
        });

        // Promise must be resolved synchronously in synchronous mode, as the code cannot pause
        // to wait for resolve/reject without futures' pause mechanism being available.
        it('should throw an error when the load callback does not resolve or reject the promise synchronously', function () {
            expect(function () {
                loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    environment,
                    module,
                    enclosingScope,
                    sinon.stub()
                ).yieldSync();
            }).to.throw(
                Exception,
                'include(/path/to/my/module.php) :: Async support not enabled'
            );
        });

        it('should throw an error when the load callback resolves with a string', function () {
            expect(function () {
                loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    environment,
                    module,
                    enclosingScope,
                    function (path, promise) {
                        promise.resolve('<?php print "this is not a valid loader result";');
                    }
                ).yieldSync();
            }).to.throw(
                Exception,
                'include(/path/to/my/module.php) :: Returning a PHP string is not supported'
            );
        });

        _.each({
            'a boolean': true,
            'a number': 21
        }, function (value, type) {
            it('should throw an error when the load callback resolves with ' + type, function () {
                expect(function () {
                    loader.load(
                        'include',
                        '/path/to/my/module.php',
                        {},
                        environment,
                        module,
                        enclosingScope,
                        function (path, promise) {
                            promise.resolve(value);
                        }
                    ).yieldSync();
                }).to.throw(
                    Exception,
                    'include(/path/to/my/module.php) :: Module is in a weird format'
                );
            });
        });
    });
});
