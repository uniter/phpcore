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
    require('phpcommon'),
    require('../Exception/LoadFailedException')
], function (
    _,
    phpCommon,
    LoadFailedException
) {
    var hasOwn = {}.hasOwnProperty,
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
     * @constructor
     */
    function Includer(
        callStack,
        valueFactory,
        scopeFactory,
        loader,
        optionSet
    ) {
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
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
            return hasOwn.call(this.includedPaths, path);
        },

        /**
         * Creates an includer for include(...), require(...) and the _once(...) variants
         *
         * @param {string} type "include", "require" or a "_once" variant
         * @param {string} errorLevel One of the PHPError.E_* constant
         * @param {Environment} environment
         * @param {Module} module PHP Module that the include occurred inside
         * @param {NamespaceScope} topLevelNamespaceScope
         * @param {string} includedPath
         * @param {Scope} enclosingScope
         * @param {Object} options
         * @returns {Value}
         * @throws {Exception} When no include transport has been configured
         * @throws {Error} When the loader throws a generic error
         */
        include: function (
            type,
            errorLevel,
            environment,
            module,
            topLevelNamespaceScope,
            includedPath,
            enclosingScope,
            options
        ) {
            var includer = this,
                includeFunction = includer.optionSet.getOption(INCLUDE_OPTION),
                includeScope,
                previousError;

            if (!includeFunction) {
                throw new Exception(
                    type + '(' + includedPath + ') :: No "' +
                    INCLUDE_OPTION +
                    '" transport option is available for loading the module.'
                );
            }

            includeScope = includer.scopeFactory.createLoadScope(
                enclosingScope,
                topLevelNamespaceScope.getFilePath(),
                type
            );

            // Mark the module as included so we may avoid including it a second time
            includer.includedPaths[includedPath] = true;

            try {
                return includer.loader.load(
                    type,
                    includedPath,
                    options,
                    environment,
                    module,
                    includeScope,
                    function (path, promise, parentPath, valueFactory) {
                        return includeFunction(path, promise, parentPath, valueFactory);
                    }
                );
            } catch (error) {
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
        }
    });

    return Includer;
}, {strict: true});
