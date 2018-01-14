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
    PHPFatalError = require('phpcommon').PHPFatalError,
    Promise = require('lie');

module.exports = function (internals) {
    var pausable = internals.pausable,
        /**
         * Checks whether the returned result is a Promise and if so,
         * if we are in async mode, it pauses PHP execution until the promise
         * is resolved or rejected
         *
         * @param {*} result
         */
        handlePromise = function (result) {
            var pause;

            if (!(result instanceof Promise)) {
                return;
            }

            if (!pausable) {
                throw new Error(
                    'Cannot wait for promise returned from JS-land to resolve - async mode is not available'
                );
            }

            pause = pausable.createPause();

            // Wait for the returned promise to resolve or reject before continuing
            result.then(function (resultValue) {
                pause.resume(resultValue);
            }, function (error) {
                pause.throw(error);
            });

            pause.now();
        };

    function JSObject() {

    }

    _.extend(JSObject.prototype, {
        /**
         * JSObject needs to implement its own way of calling out to native JS methods,
         * because the method property lookup needs to be case-sensitive, unlike PHP
         *
         * @param {string} name
         * @param {*[]} args
         * @returns {*}
         */
        '__call': function (name, args) {
            var object = this,
                result;

            if (!_.isFunction(object[name])) {
                throw new PHPFatalError(
                    PHPFatalError.UNDEFINED_METHOD,
                    {
                        className: 'JSObject',
                        methodName: name
                    }
                );
            }

            result = object[name].apply(object, args);

            // A promise may be returned from the method, in which case
            // we need to block PHP execution until it is resolved or rejected
            handlePromise(result);

            return result;
        },

        /**
         * In JavaScript, objects cannot normally be made callable, only functions
         * (and Proxies with the "apply" trap) -
         * this magic method is implemented to allow imported JS functions to be callable.
         *
         * @returns {*}
         */
        '__invoke': function () {
            var object = this,
                result;

            if (!_.isFunction(object)) {
                throw new Error('Attempted to invoke a non-function JS object');
            }

            result = object.apply(null, arguments);

            // A promise may be returned from the function, in which case
            // we need to block PHP execution until it is resolved or rejected
            handlePromise(result);

            return result;
        }
    });

    return JSObject;
};
