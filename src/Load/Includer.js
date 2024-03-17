/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash'),
    require('path'),
    require('phpcommon'),
    require('../Exception/LoadFailedException')
], function (
    _,
    path,
    phpCommon,
    LoadFailedException
) {
    var hasOwn = {}.hasOwnProperty,
        resolvePath = path.resolve,
        Exception = phpCommon.Exception,
        INCLUDE_OPTION = 'include',
        PHPError = phpCommon.PHPError;

    /**
     * Handles include(...), require(...) and the _once(...) variants
     *
     * @param {CallStack} callStack
     * @param {ValueFactory} valueFactory
     * @param {ScopeFactory} scopeFactory
     * @param {Loader} loader
     * @param {OptionSet} optionSet
     * @param {Flow} flow
     * @constructor
     */
    function Includer(
        callStack,
        valueFactory,
        scopeFactory,
        loader,
        optionSet,
        flow
    ) {
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {Flow}
         */
        this.flow = flow;
        /**
         * @type {Object.<string, boolean>}
         */
        this.includedPaths = {};
        /**
         * @type {Loader}
         */
        this.loader = loader;
        /**
         * @type {OptionSet}
         */
        this.optionSet = optionSet;
        /**
         * @type {ScopeFactory}
         */
        this.scopeFactory = scopeFactory;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(Includer.prototype, {
        /**
         * Determines whether the given module has already been included
         *
         * @param {string} path
         * @returns {boolean}
         */
        hasModuleBeenIncluded: function (path) {
            var includer = this,
                // Resolve the path, as the eventual file is the one that must be unique.
                // This will handle parent-directory ".." symbols, for example.
                resolvedPath = resolvePath(path);

            return hasOwn.call(includer.includedPaths, resolvedPath);
        },

        /**
         * Creates an includer for include(...), require(...) and the _once(...) variants
         *
         * @param {string} type "include", "require" or a "_once" variant
         * @param {string} errorLevel One of the PHPError.E_* constant
         * @param {Environment} environment
         * @param {Module} module PHP Module that the include occurred inside
         * @param {string} includedPath
         * @param {Scope} enclosingScope
         * @param {Object} options
         * @returns {ChainableInterface<Value>}
         * @throws {Exception} When no include transport has been configured
         * @throws {Error} When the loader throws a generic error
         */
        include: function (
            type,
            errorLevel,
            environment,
            module,
            includedPath,
            enclosingScope,
            options
        ) {
            var includer = this,
                includeFunction = includer.optionSet.getOption(INCLUDE_OPTION),
                includeScope,
                previousError,
                // Resolve the path first - see .hasModuleBeenIncluded(...).
                resolvedPath = resolvePath(includedPath);

            if (!includeFunction) {
                throw new Exception(
                    type + '(' + includedPath + ') :: No "' +
                    INCLUDE_OPTION +
                    '" transport option is available for loading the module.'
                );
            }

            includeScope = includer.scopeFactory.createLoadScope(
                enclosingScope,
                module.getFilePath(),
                type
            );

            // Mark the module as included so we may avoid including it a second time.
            includer.includedPaths[resolvedPath] = true;

            return includer.loader
                .load(
                    type,
                    includedPath,
                    options,
                    environment,
                    module,
                    includeScope,
                    function (path, promise, parentPath, valueFactory) {
                        return includeFunction(path, promise, parentPath, valueFactory);
                    }
                )
                .asValue()
                .next(
                    function (result) {
                        if (result.getUnderlyingType() === 'missing') {
                            return includer.valueFactory.createInteger(1);
                        }

                        return includer.valueFactory.coerce(result);
                    },
                    function (error) {
                        if (!(error instanceof LoadFailedException)) {
                            // Rethrow for anything other than the expected possible exception(s) trying to load the module
                            throw error;
                        }

                        previousError = error.getPreviousError();

                        includer.callStack.raiseError(
                            PHPError.E_WARNING,
                            type + '(' + includedPath + '): failed to open stream: ' +
                            (previousError ? previousError.message : 'Unknown error')
                        );
                        includer.callStack.raiseError(
                            errorLevel,
                            type + '(): Failed opening \'' + includedPath + '\' for inclusion'
                        );

                        return includer.valueFactory.createBoolean(false);
                    }
                );
        }
    });

    return Includer;
}, {strict: true});
