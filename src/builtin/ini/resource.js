/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = function () {
    return {
        /**
         * Sets the maximum amount of memory in bytes that a PHP script is allowed to allocate.
         * Note that this can be set to -1 to impose no restriction.
         *
         * @see {@link https://www.php.net/manual/en/ini.core.php#ini.memory-limit}
         */
        'memory_limit': '128M'
    };
};
