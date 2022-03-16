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
        'PHP_EOL': '\n',
        'PHP_INT_MAX': Number.MAX_SAFE_INTEGER || 0x7fffffff
    };
};
