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
    CallStack = require('../../../src/CallStack'),
    Environment = require('../../../src/Environment'),
    Evaluator = require('../../../src/Load/Evaluator'),
    Exception = phpCommon.Exception,
    Loader = require('../../../src/Load/Loader').sync(),
    LoadScope = require('../../../src/Load/LoadScope'),
    Module = require('../../../src/Module'),
    OptionSet = require('../../../src/OptionSet'),
    PHPError = phpCommon.PHPError,
    Scope = require('../../../src/Scope').sync(),
    ScopeFactory = require('../../../src/ScopeFactory'),
    Translator = phpCommon.Translator,
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Evaluator', function () {
    var callStack,
        enclosingScope,
        environment,
        evaluator,
        loader,
        module,
        optionSet,
        scopeFactory,
        translator,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        enclosingScope = sinon.createStubInstance(Scope);
        environment = sinon.createStubInstance(Environment);
        evaluator = sinon.createStubInstance(Evaluator);
        loader = sinon.createStubInstance(Loader);
        module = sinon.createStubInstance(Module);
        optionSet = sinon.createStubInstance(OptionSet);
        scopeFactory = sinon.createStubInstance(ScopeFactory);
        translator = sinon.createStubInstance(Translator);
        valueFactory = new ValueFactory(null, callStack);

        callStack.getCurrentModule.returns(module);
        callStack.getCurrentScope.returns(enclosingScope);
        callStack.getLastFilePath.returns('/path/to/my/module.php');
        optionSet.getOptions.returns({my: 'options'});
        callStack.raiseError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, message) {
                throw new Error('Fake PHP ' + level + ': ' + message);
            });
        translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });

        evaluator = new Evaluator(
            scopeFactory,
            translator,
            optionSet,
            callStack,
            loader
        );
    });

    describe('eval()', function () {
        var callEval;

        beforeEach(function () {
            callEval = function (code) {
                return evaluator.eval(code, environment);
            };
        });

        describe('when no "eval" option has been specified', function () {
            it('should throw', function () {
                expect(function () {
                    callEval('$myCode();');
                }).to.throw(
                    Exception,
                    'eval(...) :: No "eval" interpreter option is available.'
                );
            });
        });

        describe('when the "eval" option has been specified', function () {
            var evalOption;

            beforeEach(function () {
                evalOption = sinon.stub();

                optionSet.getOption
                    .withArgs('eval')
                    .returns(evalOption);

                callStack.getLastFilePath
                    .returns('/path/to/my/module.php');
            });

            it('should invoke the Loader with the "eval" type', function () {
                callEval('$myCode = "to evaluate";');

                expect(loader.load).to.have.been.calledWith('eval');
            });

            it('should invoke the Loader with the correct eval path string', function () {
                callEval('$myCode = "to evaluate";');

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    '[Translated] core.eval_path {"path":"/path/to/my/module.php"}'
                );
            });

            it('should invoke the Loader with the current options', function () {
                callEval('$myCode = "to evaluate";');

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    {my: 'options'}
                );
            });

            it('should invoke the Loader with the Environment', function () {
                callEval('$myCode = "to evaluate";');

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(environment)
                );
            });

            it('should invoke the Loader with the current Module', function () {
                callEval('$myCode = "to evaluate";');

                expect(loader.load).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(module)
                );
            });

            it('should invoke the Loader with a correctly created LoadScope', function () {
                var evalLoadScope = sinon.createStubInstance(LoadScope);
                scopeFactory.createLoadScope
                    .withArgs(
                        sinon.match.same(enclosingScope),
                        '/path/to/my/module.php',
                        'eval'
                    )
                    .returns(evalLoadScope);

                callEval('$myCode = "to evaluate";');

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
                    resultValue = valueFactory.createString('my eval result');
                evalOption
                    .withArgs(
                        // Note that code will have been prefixed with "<?php"
                        '<?php $myCode = "to evaluate";',
                        '[Translated] core.eval_path {"path":"/path/to/my/module.php"}',
                        sinon.match.same(promise),
                        '/path/to/my/parent/module.php',
                        sinon.match.same(valueFactory)
                    )
                    .returns(resultValue);
                callEval('$myCode = "to evaluate";', enclosingScope);

                loadFunction = loader.load.args[0][6];

                expect(loadFunction).to.be.a('function');
                expect(
                    loadFunction(
                        '[Translated] core.eval_path {"path":"/path/to/my/module.php"}',
                        promise,
                        '/path/to/my/parent/module.php',
                        valueFactory
                    )
                ).to.equal(resultValue);
            });

            it('should return the result from the Loader', function () {
                var resultValue = valueFactory.createString('my eval result');
                loader.load.returns(resultValue);

                expect(callEval('$myCode();'))
                    .to.equal(resultValue);
            });

            it('should not catch any errors', function () {
                loader.load.throws(new Error('Bang!'));

                expect(function () {
                    callEval('$myCode();');
                }).to.throw('Bang!');
            });
        });
    });
});
