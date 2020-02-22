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
     * Thrown when an error occurs during parsing of PHP code, eg. when eval(...) is called
     *
     * @see {@link https://secure.php.net/manual/en/class.parseerror.php}
     * @constructor
     */
    function ParseError() {
        internals.callSuperConstructor(this, arguments);
    }

    internals.extendClass('CompileError');

    internals.disableAutoCoercion();

    return ParseError;
};
