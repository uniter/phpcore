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
     * Base class for compilation errors
     *
     * @see {@link https://secure.php.net/manual/en/class.compileerror.php}
     * @constructor
     */
    function CompileError() {
        internals.callSuperConstructor(this, arguments);
    }

    // Extend the base Error class
    internals.extendClass('Error');

    internals.disableAutoCoercion();

    return CompileError;
};
