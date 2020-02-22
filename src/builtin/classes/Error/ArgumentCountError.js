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
    /**
     * Thrown when an invalid number of arguments are passed to a user-defined function or method
     *
     * @see {@link https://secure.php.net/manual/en/class.argumentcounterror.php}
     * @constructor
     */
    function ArgumentCountError() {
        internals.callSuperConstructor(this, arguments);
    }

    // Extend the base TypeError class
    internals.extendClass('TypeError');

    internals.disableAutoCoercion();

    return ArgumentCountError;
};
