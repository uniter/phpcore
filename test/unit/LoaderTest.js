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
    pausable = require('pausable'),
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    AsyncLoader = require('../../src/Loader').async(pausable),
    Engine = require('../../src/Engine'),
    Environment = require('../../src/Environment'),
    Exception = phpCommon.Exception,
    SyncLoader = require('../../src/Loader').sync(),
    LoadFailedException = require('../../src/Exception/LoadFailedException'),
    Module = require('../../src/Module'),
    Promise = require('lie'),
    Scope = require('../../src/Scope').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Loader', function () {
    beforeEach(function () {
        this.valueFactory = new ValueFactory();
        this.elements = [];
        this.enclosingScope = sinon.createStubInstance(Scope);
        this.environment = sinon.createStubInstance(Environment);
        this.module = sinon.createStubInstance(Module);
        this.subEngine = sinon.createStubInstance(Engine);

        this.module.getFilePath.returns('/path/to/my/current/module.php');
    });

    describe('load()', function () {
        describe('when Pausable is not available', function () {
            beforeEach(function () {
                this.loadCallback = sinon.spy(function (path, promise) {
                    var stubModule = sinon.stub();
                    stubModule.returns(this.subEngine);

                    promise.resolve(stubModule);
                }.bind(this));
                this.loader = new SyncLoader(this.valueFactory, null);

                this.subEngine.execute.returns(this.valueFactory.createString('my sync module result'));
            });

            it('should return the result resolved by the load callback', function () {
                var resultValue = this.loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    this.environment,
                    this.module,
                    this.enclosingScope,
                    this.loadCallback
                );

                expect(resultValue).to.be.an.instanceOf(Value);
                expect(resultValue.getType()).to.equal('string');
                expect(resultValue.getNative()).to.equal('my sync module result');
            });

            it('should pass the path to the resource being loaded to the load callback', function () {
                this.loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    this.environment,
                    this.module,
                    this.enclosingScope,
                    this.loadCallback
                );

                expect(this.loadCallback).to.have.been.calledOnce;
                expect(this.loadCallback).to.have.been.calledWith('/path/to/my/module.php');
            });

            it('should pass the path to the current module performing the load to the load callback', function () {
                this.loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    this.environment,
                    this.module,
                    this.enclosingScope,
                    this.loadCallback
                );

                expect(this.loadCallback).to.have.been.calledOnce;
                expect(this.loadCallback).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    '/path/to/my/current/module.php'
                );
            });

            it('should pass the path to the ValueFactory to the load callback', function () {
                this.loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    this.environment,
                    this.module,
                    this.enclosingScope,
                    this.loadCallback
                );

                expect(this.loadCallback).to.have.been.calledOnce;
                expect(this.loadCallback).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(this.valueFactory)
                );
            });

            it('should use a Value returned by the load callback as the module\'s returned value', function () {
                var resultValue = this.loader.load(
                    'include',
                    '/path/to/my/module.php',
                    {},
                    this.environment,
                    this.module,
                    this.enclosingScope,
                    function (path, promise) {
                        promise.resolve(this.valueFactory.createString('my fixed module result'));
                    }.bind(this)
                );

                expect(resultValue).to.be.an.instanceOf(Value);
                expect(resultValue.getType()).to.equal('string');
                expect(resultValue.getNative()).to.equal('my fixed module result');
            });

            it('should throw an error with the error when the load callback rejects', function () {
                expect(function () {
                    this.loader.load(
                        'include',
                        '/path/to/my/module.php',
                        {},
                        this.environment,
                        this.module,
                        this.enclosingScope,
                        function (path, promise) {
                            promise.reject(new Error('There was some issue with the include'));
                        }.bind(this)
                    );
                }.bind(this)).to.throw(LoadFailedException, 'Load failed :: There was some issue with the include');
            });

            // Promise must be resolved synchronously in synchronous mode, as the code cannot pause
            // to wait for resolve/reject without Pausable being available
            it('should throw an error when the load callback does not resolve or reject the promise synchronously', function () {
                expect(function () {
                    this.loader.load(
                        'include',
                        '/path/to/my/module.php',
                        {},
                        this.environment,
                        this.module,
                        this.enclosingScope,
                        sinon.stub()
                    );
                }.bind(this)).to.throw(
                    Exception,
                    'include(/path/to/my/module.php) :: Async support not enabled'
                );
            });

            it('should throw an error when the load callback resolves with a string', function () {
                expect(function () {
                    this.loader.load(
                        'include',
                        '/path/to/my/module.php',
                        {},
                        this.environment,
                        this.module,
                        this.enclosingScope,
                        function (path, promise) {
                            promise.resolve('<?php print "this is not a valid loader result";');
                        }.bind(this)
                    );
                }.bind(this)).to.throw(
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
                        this.loader.load(
                            'include',
                            '/path/to/my/module.php',
                            {},
                            this.environment,
                            this.module,
                            this.enclosingScope,
                            function (path, promise) {
                                promise.resolve(value);
                            }.bind(this)
                        );
                    }.bind(this)).to.throw(
                        Exception,
                        'include(/path/to/my/module.php) :: Module is in a weird format'
                    );
                });
            });
        });

        describe('when Pausable is available', function () {
            beforeEach(function () {
                this.loader = new AsyncLoader(this.valueFactory, pausable);

                this.subEngine.execute.returns(
                    Promise.resolve(this.valueFactory.createString('my async module result'))
                );
            });

            it('should return the result resolved by the load callback', function () {
                 return pausable.call(this.loader.load, [
                    'include',
                    '/path/to/my/module.php',
                    {},
                    this.environment,
                    this.module,
                    this.enclosingScope,
                    function (path, promise) {
                        var stubModule = sinon.stub();
                        stubModule.returns(this.subEngine);

                        // Pause before resolving, to test async behaviour
                        setTimeout(function () {
                            promise.resolve(stubModule);
                        }, 1);
                    }.bind(this)
                ], this.loader).then(function (resultValue) {
                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getType()).to.equal('string');
                    expect(resultValue.getNative()).to.equal('my async module result');
                });
            });

            it('should throw an error with the error when the load callback rejects', function () {
                return expect(pausable.call(this.loader.load, [
                    'include',
                    '/path/to/my/module.php',
                    {},
                    this.environment,
                    this.module,
                    this.enclosingScope,
                    function (path, promise) {
                        // Pause before resolving, to test async behaviour
                        setTimeout(function () {
                            promise.reject(new Error('There was some issue with the include'));
                        }, 1);
                    }.bind(this)
                ], this.loader)).to.eventually.be.rejectedWith(
                    LoadFailedException,
                    'Load failed :: There was some issue with the include'
                );
            });
        });
    });
});
