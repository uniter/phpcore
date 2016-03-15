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
    PHPFatalError = require('phpcommon').PHPFatalError;

module.exports = function () {
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
            var object = this;

            if (!_.isFunction(object[name])) {
                throw new PHPFatalError(
                    PHPFatalError.UNDEFINED_METHOD,
                    {
                        className: 'JSObject',
                        methodName: name
                    }
                );
            }

            return object[name].apply(object, args);
        },

        '__invoke': function () {
            var object = this;

            if (!_.isFunction(object)) {
                throw new Error('Attempted to invoke a non-function JS object');
            }

            return object.apply(null, arguments);
        }
    });

    return JSObject;
};
