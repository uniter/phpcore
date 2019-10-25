/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = function (internals) {
    /*jshint bitwise: false */
    var E_ALL = internals.getConstant('E_ALL'),
        E_DEPRECATED = internals.getConstant('E_DEPRECATED'),
        E_NOTICE = internals.getConstant('E_NOTICE'),
        E_STRICT = internals.getConstant('E_STRICT');

    return {
        /**
         * Determines whether errors should be printed to stdout or hidden from the user.
         * Errors are always written to stderr regardless of this setting.
         *
         * The value `stderr` will cause both messages to be written to stderr.
         *
         * @see {@link https://www.php.net/manual/en/errorfunc.configuration.php#ini.display-errors}
         */
        'display_errors': true,

        /**
         * Controls what levels of error are reported to the user.
         *
         * @see {@link https://www.php.net/manual/en/errorfunc.configuration.php#ini.error-reporting}
         */
        'error_reporting': E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED
    };
};
