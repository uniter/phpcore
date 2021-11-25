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
    require('../Value/Exit'),
    require('../Exception/LoadFailedException'),
    require('../Value')
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
     * @param {string} mode
     * @constructor
     */
    function Loader(valueFactory, mode) {
        /**
         * @type {string}
         */
        this.mode = mode;
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
         * @returns {FutureValue}
         */
        load: function (type, filePath, options, environment, module, enclosingScope, load) {
            var done = false,
                loader = this,
                subOptions;

            // Always return a FutureValue, for a consistent interface regardless of synchronicity mode
            return loader.valueFactory.createFuture(function (resolveFuture, rejectFuture/*, restoreCallStack*/) {
                /**
                 * Completes an unsuccessful module load
                 *
                 * @param {Error|ObjectValue<Throwable>} error
                 */
                function failWith(error) {
                    done = true;

                    rejectFuture(error);
                }

                /**
                 * Completes a successful module load, with special handling for a returned ExitValue
                 *
                 * @param {Value} moduleResult
                 */
                function succeedWith(moduleResult) {
                    done = true;

                    if (moduleResult instanceof ExitValue) {
                        // When including a module, Engine.js will have resolved with an ExitValue
                        // rather than rejecting with it
                        failWith(moduleResult);
                        return;
                    }

                    resolveFuture(moduleResult);
                }

                /**
                 * Called by the transport when the load was successful
                 *
                 * @param {Function|Value|string} valueOrModule
                 */
                function resolve(valueOrModule) {
                    var executeResult;

                    // Handle wrapper function being returned from loader for module
                    if (_.isFunction(valueOrModule)) {
                        // if (pause) {
                        //     // Restore the paused stack frames before invoking the load, so that
                        //     // any errors raised during will have access to the complete call stack
                        //     pause.restoreCallStack();
                        // }

                        executeResult = valueOrModule(subOptions, environment, enclosingScope).execute();

                        if (loader.mode !== 'async') {
                            succeedWith(executeResult);
                            return;
                        }

                        executeResult.then(
                            succeedWith,
                            function (error) {
                                failWith(error);
                            }
                        );

                        return;
                    }

                    // Handle PHP code string being returned from loader for module
                    if (_.isString(valueOrModule)) {
                        failWith(new Exception(type + '(' + filePath + ') :: Returning a PHP string is not supported'));
                        return;
                    }

                    // Handle a value object being returned as the module's return value
                    if (loader.valueFactory.isValue(valueOrModule)) {
                        succeedWith(valueOrModule);
                        return;
                    }

                    failWith(new Exception(type + '(' + filePath + ') :: Module is in a weird format'));
                }

                /**
                 * Called by the transport when the load was unsuccessful
                 *
                 * @param {Error|ObjectValue<Throwable>} error
                 */
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

                    failWith(subError);
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

                if (done) {
                    // Future was synchronously either resolved or rejected, which is compatible
                    // with any synchronicity mode
                    return;
                }

                if (!done && loader.mode !== 'async') {
                    // We're not in async mode, so we cannot yield while the module is loaded
                    throw new Exception(type + '(' + filePath + ') :: Async support not enabled');
                }

                // We're now in async mode and waiting for the module to be loaded
            });
        }
    });

    return Loader;
}, {strict: true});
