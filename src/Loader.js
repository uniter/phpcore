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
    require('./Value/Exit'),
    require('./Exception/LoadFailedException'),
    require('./Value')
], function (
    _,
    path,
    phpCommon,
    ExitValue,
    LoadFailedException,
    Value
) {
    var Exception = phpCommon.Exception,
        PHPFatalError = phpCommon.PHPFatalError,
        PHPParseError = phpCommon.PHPParseError;

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
         * @param {string} filePath The path to the resource being loaded
         * @param {object} options
         * @param {Environment} environment
         * @param {Module} module
         * @param {Scope} enclosingScope
         * @param {Function} load
         * @returns {*}
         */
        load: function (type, filePath, options, environment, module, enclosingScope, load) {
            var done = false,
                errorResult = null,
                loader = this,
                pause = null,
                result,
                subOptions;

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
                    throw new Exception(type + '(' + filePath + ') :: Returning a PHP string is not supported');
                }

                // Handle a value object being returned as the module's return value
                if (loader.valueFactory.isValue(valueOrModule)) {
                    completeWith(valueOrModule);
                    return;
                }

                throw new Exception(type + '(' + filePath + ') :: Module is in a weird format');
            }

            function reject(error) {
                var filePath,
                    lineNumber,
                    subError;

                if (error instanceof PHPParseError) {
                    filePath = error.getFilePath();
                    lineNumber = error.getLineNumber();

                    // Parse errors should be thrown as a ParseError in PHP 7+
                    // NB: The Error class' constructor will fetch file and line number info
                    subError = loader.valueFactory.createErrorObject(
                        'ParseError',
                        error.getMessage(),
                        null,
                        null,
                        filePath !== null ? filePath : '(unknown)',
                        lineNumber !== null ? lineNumber : 0
                    );
                } else if (error instanceof PHPFatalError) {
                    // Uncatchable fatal error (?)

                    subError = error;
                } else if (error instanceof Value) {
                    // Throwable Error, Exception or an exit occurred (ExitValue)

                    subError = error;
                } else {
                    subError = new LoadFailedException(error);
                }

                if (pause) {
                    pause.throw(subError);
                } else {
                    errorResult = subError;
                }
            }

            // Resolve "./" and "../" components in the file path
            filePath = path.normalize(filePath);

            subOptions = _.extend({}, options, {
                // TODO: Can we improve this? Can we include a module's path in its compiled output,
                //       rather than having the runtime provide its path like this?
                'path': filePath
            });

            // NB: The loader may throw an error, which will be caught and passed to reject()
            //     for consistent behaviour
            try {
                load(filePath, {
                    reject: reject,
                    resolve: resolve
                }, module.getFilePath(), loader.valueFactory);
            } catch (error) {
                reject(error);
            }

            if (errorResult) {
                throw errorResult;
            }

            if (done) {
                return result;
            }

            if (!loader.pausable) {
                // Pausable is not available, so we cannot yield while the module is loaded
                throw new Exception(type + '(' + filePath + ') :: Async support not enabled');
            }

            pause = loader.pausable.createPause();
            return pause.now();
        }
    });

    return Loader;
}, {strict: true});
