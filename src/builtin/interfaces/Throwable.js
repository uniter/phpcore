/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var phpCommon = require('phpcommon'),
    util = require('util'),
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError,

    UNCAUGHT_EMPTY_THROWABLE = 'core.uncaught_empty_throwable',
    UNCAUGHT_THROWABLE = 'core.uncaught_throwable';

module.exports = function (internals) {
    var translator = internals.translator;

    /**
     * PHP 7 Throwable interface
     *
     * @see {@link https://secure.php.net/manual/en/class.throwable.php}
     *
     * @constructor
     */
    function Throwable() {
    }

    util.inherits(Throwable, PHPError);

    internals.disableAutoCoercion();

    internals.defineUnwrapper(function (errorValue) {
        /*
         * When throwing/returning a Throwable instance to JS-land, by default convert it to a PHPFatalError from PHPCommon.
         * Note that this is also used when returning rather than throwing, due to use of this unwrapper.
         * This is useful for consistency, in the scenario where an Error or Exception is returned (not thrown)
         * to JS-land, then later thrown from JS-land.
         */
        var message = errorValue.getProperty('message').getNative();

        if (message !== '') {
            message = translator.translate(UNCAUGHT_THROWABLE, {
                name: errorValue.getClassName(),
                message: message
            });
        } else {
            message = translator.translate(UNCAUGHT_EMPTY_THROWABLE, {
                name: errorValue.getClassName()
            });
        }

        return new PHPFatalError(
            message,
            errorValue.getProperty('file').getNative(),
            errorValue.getProperty('line').getNative()
        );
    });

    return Throwable;
};
