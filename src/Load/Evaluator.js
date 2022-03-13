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
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception,

    EVAL_OPTION = 'eval',
    EVAL_PATH = 'core.eval_path',
    UNKNOWN = 'core.unknown';

/**
 * Handles the PHP eval(...) construct
 *
 * @param {ScopeFactory} scopeFactory
 * @param {Translator} translator
 * @param {OptionSet} optionSet
 * @param {CallStack} callStack
 * @param {Loader} loader
 * @param {Environment} environment
 * @constructor
 */
function Evaluator(
    scopeFactory,
    translator,
    optionSet,
    callStack,
    loader
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {Loader}
     */
    this.loader = loader;
    /**
     * @type {string}
     */
    this.optionSet = optionSet;
    /**
     * @type {ScopeFactory}
     */
    this.scopeFactory = scopeFactory;
    /**
     * @type {Translator}
     */
    this.translator = translator;
}

_.extend(Evaluator.prototype, {
    /**
     * Evaluates the given PHP code using the configured `eval` option
     *
     * @param {string} code
     * @param {Environment} environment
     * @returns {Value}
     */
    eval: function (code, environment) {
        var evaluator = this,
            enclosingScope = evaluator.callStack.getCurrentScope(),
            evalFunction = evaluator.optionSet.getOption(EVAL_OPTION),
            evalScope,
            lineNumber,
            path;

        if (!evalFunction) {
            throw new Exception(
                'eval(...) :: No "' + EVAL_OPTION + '" interpreter option is available.'
            );
        }

        path = evaluator.callStack.getLastFilePath();
        evalScope = evaluator.scopeFactory.createLoadScope(enclosingScope, path, 'eval');
        lineNumber = evaluator.callStack.getLastLine();

        if (lineNumber === null) {
            lineNumber = evaluator.translator.translate(UNKNOWN);
        }

        return evaluator.loader.load(
            'eval',
            // Use the path to the script that called eval() along with this suffix
            // as the path to the current file inside the eval
            evaluator.translator.translate(EVAL_PATH, {path: path, lineNumber: lineNumber}),
            evaluator.optionSet.getOptions(),
            environment,
            evaluator.callStack.getCurrentModule(),
            evalScope,
            function (path, promise, parentPath, valueFactory) {
                return evalFunction('<?php ' + code, path, promise, parentPath, valueFactory);
            }
        );
    }
});

module.exports = Evaluator;
