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
    PHPParseError = phpCommon.PHPParseError;

module.exports = function (internals) {
    /**
     * Thrown when an error occurs during parsing of PHP code, eg. when eval(...) is called
     *
     * @see {@link https://secure.php.net/manual/en/class.parseerror.php}
     * @constructor
     */
    function ParseError() {
        // Synchronously await the superconstructor: should be fine as it should always be defined
        // and not require autoloading.
        internals.callSuperConstructor(this, arguments).yieldSync();
    }

    internals.extendClass('CompileError');

    internals.disableAutoCoercion();

    internals.defineUnwrapper(function (errorValue) {
        /*
         * When throwing/returning a ParseError instance to JS-land, convert it to a PHPParseError from PHPCommon.
         * Note that this is also used when returning rather than throwing, due to use of this unwrapper.
         * This is useful for consistency, in the scenario where a ParseError is returned (not thrown)
         * to JS-land, then later thrown from JS-land.
         *
         * Note that this unwrapper shadows the one defined on the Throwable interface.
         */
        return new PHPParseError(
            errorValue.getProperty('message').getNative(),
            errorValue.getProperty('file').getNative(),
            errorValue.getProperty('line').getNative()
        );
    });

    return ParseError;
};
