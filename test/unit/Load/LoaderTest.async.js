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
    tools = require('../tools'),
    Class = require('../../../src/Class').sync(),
    Engine = require('../../../src/Engine'),
    Environment = require('../../../src/Environment'),
    Loader = require('../../../src/Load/Loader').sync(),
    LoadFailedException = require('../../../src/Exception/LoadFailedException'),
    Module = require('../../../src/Module'),
    Namespace = require('../../../src/Namespace').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPFatalError = phpCommon.PHPFatalError,
    PHPParseError = phpCommon.PHPParseError,
    Scope = require('../../../src/Scope').sync(),
    Value = require('../../../src/Value').sync();

describe('Loader (async mode)', function () {
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
        state = tools.createIsolatedState('async');
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
        var loader;

        beforeEach(function () {
            loader = new Loader(valueFactory, 'async');

            subEngine.execute.returns(
                Promise.resolve(valueFactory.createString('my async module result'))
            );
        });

        it('should return the result resolved by the load callback', async function () {
             var resultValue = await loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    environment,
                    module,
                    enclosingScope,
                    function (path, promise) {
                        var stubModule = sinon.stub();
                        stubModule.returns(subEngine);

                        // Pause before resolving, to test async behaviour
                        setTimeout(function () {
                            promise.resolve(stubModule);
                        }, 1);
                    }
                )
                .toPromise();

            expect(resultValue).to.be.an.instanceOf(Value);
            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('my async module result');
        });

        it('should throw an error with the error when the load callback rejects with a normal JS error', function () {
            return expect(
                loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    environment,
                    module,
                    enclosingScope,
                    function (path, promise) {
                        // Pause before resolving, to test async behaviour
                        setTimeout(function () {
                            promise.reject(new Error('There was some issue with the include'));
                        }, 1);
                    }
                )
                .toPromise()
            ).to.eventually.be.rejectedWith(
                LoadFailedException,
                'Load failed :: There was some issue with the include'
            );
        });

        it('should throw an instance of ParseError when the load callback throws a PHPParseError', function () {
            var parseErrorClassObject = sinon.createStubInstance(Class),
                parseErrorObjectValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass.withArgs('ParseError')
                .returns(futureFactory.createPresent(parseErrorClassObject));
            parseErrorClassObject.instantiate.returns(parseErrorObjectValue);

            return loader.load(
                'include',
                '/path/to/my/module.php',
                {},
                environment,
                module,
                enclosingScope,
                function (path, promise) {
                    // Pause before resolving, to test async behaviour
                    setTimeout(function () {
                        promise.reject(
                            new PHPParseError('There was a problem parsing', '/path/to/my_module.php', 123)
                        );
                    }, 1);
                }
            )
                .catch(function (caughtError) {
                    expect(caughtError).to.equal(parseErrorObjectValue);
                })
                .next(function () {
                    expect(parseErrorClassObject.instantiate.args[0][0][0].getType()).to.equal('string');
                    expect(parseErrorClassObject.instantiate.args[0][0][0].getNative())
                        .to.equal('There was a problem parsing');
                })
                .toPromise();
        });

        it('should rethrow when the load callback throws a PHPFatalError', function () {
            var fatalError = new PHPFatalError('Oh dear', '/path/to/my/broken/module.php', 4444);

            return expect(
                loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    environment,
                    module,
                    enclosingScope,
                    function (path, promise) {
                        // Pause before resolving, to test async behaviour
                        setTimeout(function () {
                            promise.reject(fatalError);
                        }, 1);
                    }
                )
                .toPromise()
            ).to.eventually.be.rejectedWith(fatalError);
        });
    });
});
