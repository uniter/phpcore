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
     * @param {class} OptionSet
     * @param {class} PHPState
     * @param {object} phpCommon
     * @param {Resumable} pausable
     * @constructor
     */
    function Runtime(Environment, Engine, OptionSet, PHPState, phpCommon, pausable) {
        /**
         * @type {{classes: {}, constantGroups: Array, functionGroups: Array}}
         */
        this.builtins = {
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
         * @type {class}
         */
        this.OptionSet = OptionSet;
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
                optionSet = new runtime.OptionSet(options),
                state = new runtime.PHPState(
                    runtime.builtins,
                    stdin,
                    stdout,
                    stderr,
                    runtime.pausable,
                    optionSet
                );

            return new runtime.Environment(state);
        },

        /**
         * Installs a new set of builtins, to be available to all modules
         * compiled and executed by this runtime.
         * All fields are optional - for example, this method can be used
         * to only define a new class without also defining any constants or functions.
         *
         * @param {{classes: {}, constantGroups: Array, functionGroups: Array}} newBuiltins
         */
        install: function (newBuiltins) {
            var builtins = this.builtins;

            [].push.apply(builtins.functionGroups, newBuiltins.functionGroups);
            _.extend(builtins.classes, newBuiltins.classes);
            [].push.apply(builtins.constantGroups, newBuiltins.constantGroups);
        }
    });

    return Runtime;
}, {strict: true});
