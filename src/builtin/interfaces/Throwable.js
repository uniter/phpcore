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
    PHPError = phpCommon.PHPError;

module.exports = function (internals) {
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

    return Throwable;
};
