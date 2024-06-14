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
    CallStack = require('../../../src/CallStack'),
    Environment = require('../../../src/Environment'),
    Exception = phpCommon.Exception,
    Includer = require('../../../src/Load/Includer').sync(),
    Loader = require('../../../src/Load/Loader').sync(),
    LoadFailedException = require('../../../src/Exception/LoadFailedException'),
    LoadScope = require('../../../src/Load/LoadScope'),
    Module = require('../../../src/Module'),
    OptionSet = require('../../../src/OptionSet'),
    PHPError = phpCommon.PHPError,
    Scope = require('../../../src/Scope').sync(),
    ScopeFactory = require('../../../src/ScopeFactory');

describe('Includer', function () {
    var callStack,
        enclosingScope,
        environment,
        futureFactory,
        includer,
        loader,
        module,
        optionSet,
        scopeFactory,
        state,
        topLevelScope,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        enclosingScope = sinon.createStubInstance(Scope);
        environment = sinon.createStubInstance(Environment);
        futureFactory = state.getFutureFactory();
        includer = sinon.createStubInstance(Includer);
        loader = sinon.createStubInstance(Loader);
        module = sinon.createStubInstance(Module);
        optionSet = sinon.createStubInstance(OptionSet);
        scopeFactory = sinon.createStubInstance(ScopeFactory);
        topLevelScope = sinon.createStubInstance(Scope);
        valueFactory = state.getValueFactory();

        callStack.raiseError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, message) {
                throw new Error('Fake PHP ' + level + ': ' + message);
            });
        module.getFilePath.returns('/path/to/my/module.php');

        loader.load.returns(futureFactory.createPresent(null));

        includer = new Includer(
            callStack,
            valueFactory,
            scopeFactory,
            loader,
            optionSet,
            state.getFlow()
        );
    });

    describe('hasModuleBeenIncluded()', function () {
        var callInclude;

        beforeEach(function () {
            var includeOption = sinon.stub();

            optionSet.getOption
                .withArgs('include')
                .returns(includeOption);

            callInclude = function (includedPath, type, errorLevel, options) {
                return includer.include(
                    type || 'include',
                    errorLevel || PHPError.E_WARNING,
                    environment,
                    module,
                    includedPath,
                    enclosingScope,
                    options || {}
                ).yieldSync();
            };
        });

        it('should return true when a module has been included once', function () {
            callInclude('/my/included_path.php');

            expect(includer.hasModuleBeenIncluded('/my/included_path.php')).to.be.true;
        });

        it('should return true when a module has been included multiple times', function () {
            callInclude('/my/included_path.php');
            callInclude('/my/included_path.php'); // Second include of the same module

            expect(includer.hasModuleBeenIncluded('/my/included_path.php')).to.be.true;
        });

        it('should resolve the include path', function () {
            callInclude('/my/stuff/here/../../included_path.php');

            expect(includer.hasModuleBeenIncluded('/my/included_path.php')).to.be.true;
        });

        it('should resolve the given path', function () {
            callInclude('/my/included_path.php');

            expect(includer.hasModuleBeenIncluded('/my/stuff/here/../../included_path.php')).to.be.true;
        });

        it('should return false when a module has not been included', function () {
            expect(includer.hasModuleBeenIncluded('/my/included_path.php')).to.be.false;
        });
    });

    describe('include()', function () {
        var callInclude;

        beforeEach(function () {
            callInclude = function (includedPath, type, errorLevel, options) {
                return includer.include(
                    type || 'include',
                    errorLevel || PHPError.E_WARNING,
                    environment,
                    module,
                    includedPath,
                    enclosingScope,
                    options || {}
                ).yieldSync();
            };
        });

        describe('when no "include" option has been specified', function () {
            it('should throw', function () {
                expect(function () {
                    callInclude('/some/path/to/my_included_module.php');
                }).to.throw(
                    Exception,
                    'include(/some/path/to/my_included_module.php) :: No "include" transport option is available for loading the module.'
                );
            });
        });

        describe('when the "include" option has been specified', function () {
            var includeOption;

            beforeEach(function () {
                includeOption = sinon.stub();

                optionSet.getOption
                    .withArgs('include')
                    .returns(includeOption);

                module.getFilePath
                    .returns('/path/to/my/parent/module.php');
            });

            it('should invoke the Loader with the "include" type', function () {
                callInclude('/some/path/to/my_included_module.php');

                expect(loader.load).to.have.been.calledWith('include');
            });

            it('should invoke the Loader with the correct included path string', function () {
                callInclude('/some/path/to/my_included_module.php');

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    '/some/path/to/my_included_module.php'
                );
            });

            it('should invoke the Loader with the current options', function () {
                callInclude('/some/path/to/my_included_module.php', null, null, {my: 'options'});

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    {my: 'options'}
                );
            });

            it('should invoke the Loader with the Environment', function () {
                callInclude('/some/path/to/my_included_module.php');

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(environment)
                );
            });

            it('should invoke the Loader with the current Module', function () {
                callInclude('/some/path/to/my_included_module.php');

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(module)
                );
            });

            it('should invoke the Loader with a correctly created LoadScope', function () {
                var includeLoadScope = sinon.createStubInstance(LoadScope);
                scopeFactory.createLoadScope
                    .withArgs(sinon.match.same(enclosingScope), '/path/to/my/parent/module.php', 'include')
                    .returns(includeLoadScope);

                callInclude('/some/path/to/my_included_module.php');

                expect(loader.load).to.have.been.calledWith(
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
                    resultValue = valueFactory.createString('my include\'d module result');
                includeOption
                    .withArgs(
                        '/some/path/to/my_included_module.php',
                        sinon.match.same(promise),
                        '/path/to/my/parent/module.php',
                        sinon.match.same(valueFactory)
                    )
                    .returns(resultValue);
                callInclude('/some/path/to/my_included_module.php', enclosingScope);

                loadFunction = loader.load.args[0][6];

                expect(loadFunction).to.be.a('function');
                expect(
                    loadFunction(
                        '/some/path/to/my_included_module.php',
                        promise,
                        '/path/to/my/parent/module.php',
                        valueFactory
                    )
                ).to.equal(resultValue);
            });

            it('should return the result from the Loader', function () {
                var resultValue = valueFactory.createString('my include\'d module result');
                loader.load.returns(resultValue);

                expect(callInclude('/some/path/to/my_included_module.php'))
                    .to.equal(resultValue);
            });

            it('should return int(1) when the Loader returns a MissingValue', function () {
                var resultValue;
                loader.load.returns(valueFactory.createMissing());

                resultValue = callInclude('/some/path/to/my_included_module.php');

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(1);
            });

            describe('on LoadFailedException', function () {
                it('should return bool(false)', function () {
                    loader.load.returns(valueFactory.createRejection(new LoadFailedException(new Error('Oh dear'))));

                    expect(callInclude('/some/path/to/my_included_module.php').getNative())
                        .to.be.false;
                });

                it('should raise a warning with the underlying error when one is given', function () {
                    loader.load.returns(valueFactory.createRejection(new LoadFailedException(new Error('Oh dear!'))));

                    callInclude('/some/path/to/my_included_module.php');

                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_WARNING,
                        'include(/some/path/to/my_included_module.php): failed to open stream: Oh dear!'
                    );
                });

                it('should raise a warning with a generic message when no underlying error is given', function () {
                    loader.load.returns(valueFactory.createRejection(new LoadFailedException(null)));

                    callInclude('/some/path/to/my_included_module.php');

                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_WARNING,
                        'include(/some/path/to/my_included_module.php): failed to open stream: Unknown error'
                    );
                });

                it('should raise an error of the given level', function () {
                    loader.load.returns(valueFactory.createRejection(new LoadFailedException(new Error('Oh dear!'))));

                    expect(function () {
                        callInclude(
                            '/some/path/to/my_included_module.php',
                            'require_once',
                            PHPError.E_ERROR
                        );
                    }).to.throw(
                        'Fake PHP Fatal error: require_once(): Failed opening \'/some/path/to/my_included_module.php\' for inclusion'
                    );
                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_ERROR,
                        'require_once(): Failed opening \'/some/path/to/my_included_module.php\' for inclusion'
                    );
                });
            });

            it('should not catch any other type of error', function () {
                loader.load.returns(valueFactory.createRejection(new Error('Bang!')));

                expect(function () {
                    callInclude('/some/path/to/my_included_module.php');
                }).to.throw('Bang!');
            });
        });
    });
});
