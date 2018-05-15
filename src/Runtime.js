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
    /**
     * PHPCore API encapsulator.
     *
     * @param {class} Environment
     * @param {class} Engine
     * @param {class} PHPState
     * @param {object} phpCommon
     * @param {Resumable} pausable
     * @constructor
     */
    function Runtime(Environment, Engine, PHPState, phpCommon, pausable) {
        /**
         * @type {{classes: {}, constantGroups: Array, functionGroups: Array}}
         */
        this.builtins = {
            bindingGroups: [],
            classes: {},
            constantGroups: [],
            functionGroups: []
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
         * @type {Function[]}
         */
        this.optionGroups = [];
        /**
         * @type {Resumable}
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
                pausable = runtime.pausable,
                phpCommon = runtime.phpCommon;

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
                    pausable
                );
            }

            /**
             * Creates a new factory function with some optional default options,
             * environment and top-level Scope
             *
             * @param {object|null|undefined} defaultOptions
             * @param {Environment|null|undefined} defaultEnvironment
             * @param {Scope|null|undefined} defaultTopLevelScope
             * @returns {Function}
             */
            factory.using = function (defaultOptions, defaultEnvironment, defaultTopLevelScope) {
                /**
                 * A proxying factory function that applies these defaults
                 * and then forwards onto the original factory function
                 *
                 * @param {object|null|undefined} options
                 * @param {Environment|null|undefined} environment
                 * @param {Scope|null|undefined} topLevelScope
                 * @returns {Engine}
                 */
                function proxy(options, environment, topLevelScope) {
                    options = _.extend({}, defaultOptions, options);
                    environment = environment || defaultEnvironment;
                    topLevelScope = topLevelScope || defaultTopLevelScope;

                    return factory(options, environment, topLevelScope);
                }

                return proxy;
            };

            return factory;
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
         * @returns {Environment}
         */
        createEnvironment: function (options) {
            var runtime = this,
                stdin = new Stream(),
                stdout = new Stream(),
                stderr = new Stream(),
                state = new runtime.PHPState(
                    runtime,
                    runtime.builtins,
                    stdin,
                    stdout,
                    stderr,
                    runtime.pausable,
                    runtime.optionGroups,
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
                // Allow a plugin to be defined as a function, to allow testing
                newBuiltins = newBuiltins();
            }

            [].push.apply(builtins.functionGroups, newBuiltins.functionGroups);
            _.extend(builtins.classes, newBuiltins.classes);
            [].push.apply(builtins.constantGroups, newBuiltins.constantGroups);
            [].push.apply(this.optionGroups, newBuiltins.optionGroups);
            [].push.apply(builtins.bindingGroups, newBuiltins.bindingGroups);
        }
    });

    return Runtime;
}, {strict: true});
