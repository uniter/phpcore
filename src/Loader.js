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
    require('./Value/Exit'),
    require('./Exception/LoadFailedException')
], function (
    _,
    phpCommon,
    ExitValue,
    LoadFailedException
) {
    var Exception = phpCommon.Exception;

    /**
     * @param {ValueFactory} valueFactory
     * @param {Resumable|null} pausable
     * @constructor
     */
    function Loader(valueFactory, pausable) {
        /**
         * @type {Resumable|null}
         */
        this.pausable = pausable;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(Loader.prototype, {
        /**
         * Loads a resource by calling the provided loader. Used for:
         *
         * - `include(...)`
         * - `require(...)`
         * - `eval(...)`
         *
         * When the relevant transport options are installed.
         *
         * @param {string} type The type of load to be done, eg. `eval` or `include`
         * @param {string} path The path to the resource being loaded
         * @param {object} options
         * @param {Environment} environment
         * @param {Module} module
         * @param {Scope} enclosingScope
         * @param {Function} load
         * @return {*}
         */
        load: function (type, path, options, environment, module, enclosingScope, load) {
            var done = false,
                loader = this,
                pause = null,
                result,
                subOptions = _.extend({}, options, {
                    'path': path
                });

            function completeWith(moduleResult) {
                done = true;

                if (pause) {
                    if (moduleResult instanceof ExitValue) {
                        pause.throw(moduleResult);
                        return;
                    }

                    pause.resume(moduleResult);
                } else {
                    if (moduleResult instanceof ExitValue) {
                        throw moduleResult;
                    }

                    result = moduleResult;
                }
            }

            function resolve(valueOrModule) {
                var executeResult;

                // Handle wrapper function being returned from loader for module
                if (_.isFunction(valueOrModule)) {
                    executeResult = valueOrModule(subOptions, environment, enclosingScope).execute();

                    if (!loader.pausable) {
                        completeWith(executeResult);
                        return;
                    }

                    executeResult.then(
                        completeWith,
                        function (error) {
                            pause.throw(error);
                        }
                    );

                    return;
                }

                // Handle PHP code string being returned from loader for module
                if (_.isString(valueOrModule)) {
                    throw new Exception(type + '(' + path + ') :: Returning a PHP string is not supported');
                }

                // Handle a value object being returned as the module's return value
                if (loader.valueFactory.isValue(valueOrModule)) {
                    completeWith(valueOrModule);
                    return;
                }

                throw new Exception(type + '(' + path + ') :: Module is in a weird format');
            }

            function reject(error) {
                var subError = new LoadFailedException(error);

                if (pause) {
                    pause.throw(subError);
                } else {
                    throw subError;
                }
            }

            load(path, {
                reject: reject,
                resolve: resolve
            }, module.getFilePath(), loader.valueFactory);

            if (done) {
                return result;
            }

            if (!loader.pausable) {
                // Pausable is not available, so we cannot yield while the module is loaded
                throw new Exception(type + '(' + path + ') :: Async support not enabled');
            }

            pause = loader.pausable.createPause();
            return pause.now();
        }
    });

    return Loader;
}, {strict: true});
