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
    require('microdash')
], function (
    _
) {
    /**
     * Handles include_once(...) and require_once(...)
     *
     * @param {ValueFactory} valueFactory
     * @param {Includer} includer
     * @constructor
     */
    function OnceIncluder(valueFactory, includer)
    {
        /**
         * @type {Includer}
         */
        this.includer = includer;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(OnceIncluder.prototype, {
        /**
         * Includes the specified module, returning its return value.
         * Throws if no include transport has been configured.
         * Returns boolean true if the module has already been included.
         *
         * @param {string} type "include_once" or "require_once"
         * @param {string} errorLevel One of the PHPError.E_* constants
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
        includeOnce: function (
            type,
            errorLevel,
            environment,
            module,
            topLevelNamespaceScope,
            includedPath,
            enclosingScope,
            options
        ) {
            var includer = this;

            // Note that this lookup is updated in .include(...)
            if (includer.includer.hasModuleBeenIncluded(includedPath)) {
                // Module has already been included, so just return bool(true) to PHP-land
                return includer.valueFactory.createBoolean(true);
            }

            return includer.includer.include(
                type,
                errorLevel,
                environment,
                module,
                topLevelNamespaceScope,
                includedPath,
                enclosingScope,
                options
            );
        }
    });

    return OnceIncluder;
}, {strict: true});
