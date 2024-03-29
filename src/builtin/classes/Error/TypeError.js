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
     * Base class for type errors
     *
     * @see {@link https://secure.php.net/manual/en/class.typeerror.php}
     * @constructor
     */
    function TypeError() {
        // Synchronously await the superconstructor: should be fine as it should always be defined
        // and not require autoloading.
        internals.callSuperConstructor(this, arguments).yieldSync();
    }

    // Extend the base Error class
    internals.extendClass('Error');

    internals.disableAutoCoercion();

    return TypeError;
};
