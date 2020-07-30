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
    require('./PHPState'),
    require('./Stream')
], function (
    _,
    PHPState,
    Stream
) {
    var hasOwn = {}.hasOwnProperty;

    /**
     * PHPCore API encapsulator.
     *
     * @param {class} Environment
     * @param {class} Engine
     * @param {class} PHPState
     * @param {object} phpCommon
     * @param {Resumable|null} pausable
     * @param {string} mode
     * @constructor
     */
    function Runtime(Environment, Engine, PHPState, phpCommon, pausable, mode) {
        // Check the mode given is valid
        if (mode !== 'async' && mode !== 'psync' && mode !== 'sync') {
            throw new Error('Invalid mode "' + mode + '" given - must be one of "async", "psync" or "sync"');
        }

        // For async mode we require the Pausable library to be available
        if (mode === 'async' && !pausable) {
            throw new Error('Pausable library must be provided for async mode');
        }

        /**
         * @type {{classes: {}, constantGroups: Array, functionGroups: Array}}
         */
        this.builtins = {
            bindingGroups: [],
            classGroups: [],
            classes: {},
            constantGroups: [],
            defaultINIGroups: [],
            functionGroups: [],
            translationCatalogues: []
        };
        /**
         * @type {class}
         */
        this.Engine = Engine;
        /**
         * @type {class}
         */
        this.Environment = Environment;
        /**
         * @type {string} One of: "async", "psync" or "sync"
         */
        this.mode = mode;
        /**
         * @type {Function[]}
         */
        this.optionGroups = [];
        /**
         * @type {Resumable|null}
         */
        this.pausable = pausable;
        /**
         * @type {Object}
         */
        this.phpCommon = phpCommon;
        /**
         * @type {class}
         */
        this.PHPState = PHPState;
    }

    _.extend(Runtime.prototype, {
        /**
         * Creates a factory function that can be called to create
         * a new Engine instance using this runtime's context.
         *
         * @param {Function} wrapper
         * @returns {Function}
         */
        compile: function (wrapper) {
            var runtime = this,
                mode = runtime.mode,
                pausable = runtime.pausable,
                phpCommon = runtime.phpCommon;

            /**
             * Extends an existing option set with a new set of options,
             * with special handling for the "path" option as once that option
             * has been set, its value cannot be overridden. This is because
             * the include transport configured may set a path on the returned
             * module factory (via .using(...)) but that would otherwise
             * be overridden by the default path provided by Loader (where the
             * default path is just a normalised version of the requested path,
             * rather than a resolved real path)
             *
             * @param {Object|null} existingOptions
             * @param {Object|null} newOptions
             * @return {Object}
             */
            function extendOptions(existingOptions, newOptions) {
                if (
                    existingOptions &&
                    newOptions &&
                    hasOwn.call(existingOptions, 'path') &&
                    hasOwn.call(newOptions, 'path')
                ) {
                    newOptions = _.extend({}, newOptions);
                    delete newOptions.path;
                }

                return _.extend({}, existingOptions, newOptions);
            }

            /**
             * Creates a new Engine instance using this runtime's context.
             *
             * @param {object} options
             * @param {Environment|null} environment
             * @param {Scope|null} topLevelScope
             * @returns {Engine}
             */
            function factory(options, environment, topLevelScope) {
                if (environment) {
                    options = _.extend({}, environment.getOptions(), options);
                } else {
                    environment = runtime.createEnvironment(options);
                    options = environment.getOptions();
                }

                return new runtime.Engine(
                    environment,
                    topLevelScope || null,
                    phpCommon,
                    options,
                    wrapper,
                    pausable,
                    mode
                );
            }

            /**
             * Creates a function to be exposed as .using(...) on the module factory,
             * allowing the new module factory returned when .using(...) is called
             * to itself expose a .using(...) method recursively
             *
             * @param {Function} factory
             * @return {Function}
             */
            function createSubFactory(factory) {
                /**
                 * Creates a new factory function with some optional default options,
                 * environment and top-level Scope
                 *
                 * @param {object=} defaultOptions
                 * @param {Environment=} defaultEnvironment
                 * @param {Scope=} defaultTopLevelScope
                 * @returns {Function}
                 */
                return function subFactory(defaultOptions, defaultEnvironment, defaultTopLevelScope) {
                    /**
                     * A proxying factory function that applies these defaults
                     * and then forwards onto the original factory function
                     *
                     * @param {object=} options
                     * @param {Environment=} environment
                     * @param {Scope=} topLevelScope
                     * @returns {Engine}
                     */
                    function proxy(options, environment, topLevelScope) {
                        options = extendOptions(defaultOptions, options);
                        environment = environment || defaultEnvironment;
                        topLevelScope = topLevelScope || defaultTopLevelScope;

                        return factory(options, environment, topLevelScope);
                    }

                    /**
                     * Creates a new factory function with some optional default options,
                     * environment and top-level Scope
                     */
                    proxy.using = createSubFactory(proxy);

                    return proxy;
                };
            }

            /**
             * Creates a new factory function with some optional default options,
             * environment and top-level Scope
             */
            factory.using = createSubFactory(factory);

            return factory;
        },

        /**
         * Sets one or more configuration options
         *
         * @param {object} options
         */
        configure: function (options) {
            // Configuration options are likely to be used by other option groups/bindings etc.,
            // so set those first
            this.optionGroups.unshift(function () {
                return options;
            });
        },

        /**
         * Creates a new Environment instance, useful for sharing a runtime
         * context between modules.
         * A factory function returned from `.compile(...)` may be called
         * passing an Environment instance in order to reuse it, eg.
         * to make classes, functions and global variables from one module
         * available in another outside the use of includes.
         *
         * @param {object} options
         * @param {Array=} addons
         * @returns {Environment}
         */
        createEnvironment: function (options, addons) {
            var runtime = this,
                allBuiltins = _.extend({}, runtime.builtins),
                allOptionGroups = runtime.optionGroups,
                stdin = new Stream(),
                stdout = new Stream(),
                stderr = new Stream(),
                state;

            _.each(addons, function (addon) {
                if (typeof addon === 'function') {
                    // Allow an addon to be defined as a function, to allow testing
                    addon = addon();
                }

                allBuiltins.translationCatalogues = allBuiltins.translationCatalogues.concat(addon.translationCatalogues || []);
                allBuiltins.functionGroups = allBuiltins.functionGroups.concat(addon.functionGroups || []);
                allBuiltins.classGroups = allBuiltins.classGroups.concat(addon.classGroups || []);
                allBuiltins.classes = _.extend({}, allBuiltins.classes, addon.classes);
                allBuiltins.constantGroups = allBuiltins.constantGroups.concat(addon.constantGroups || []);
                allBuiltins.defaultINIGroups = allBuiltins.defaultINIGroups.concat(addon.defaultINIGroups || []);
                allOptionGroups = allOptionGroups.concat(addon.optionGroups || []);
                allBuiltins.bindingGroups = allBuiltins.bindingGroups.concat(addon.bindingGroups || []);
            });

            state = new runtime.PHPState(
                runtime,
                allBuiltins,
                stdin,
                stdout,
                stderr,
                runtime.pausable,
                runtime.mode,
                allOptionGroups,
                options
            );

            return new runtime.Environment(state);
        },

        /**
         * Installs a new set of builtins, to be available to all modules
         * compiled and executed by this runtime.
         * All fields are optional - for example, this method can be used
         * to only define a new class without also defining any constants or functions.
         *
         * @param {Function|{classes: {}, constantGroups: Array, functionGroups: Array}} newBuiltins
         */
        install: function (newBuiltins) {
            var builtins = this.builtins;

            if (typeof newBuiltins === 'function') {
                // Allow an addon to be defined as a function, to allow testing
                newBuiltins = newBuiltins();
            }

            [].push.apply(builtins.translationCatalogues, newBuiltins.translationCatalogues);
            [].push.apply(builtins.functionGroups, newBuiltins.functionGroups);
            [].push.apply(builtins.classGroups, newBuiltins.classGroups);
            _.extend(builtins.classes, newBuiltins.classes);
            [].push.apply(builtins.constantGroups, newBuiltins.constantGroups);
            [].push.apply(builtins.defaultINIGroups, newBuiltins.defaultINIGroups);
            [].push.apply(this.optionGroups, newBuiltins.optionGroups);
            [].push.apply(builtins.bindingGroups, newBuiltins.bindingGroups);
        }
    });

    return Runtime;
}, {strict: true});
