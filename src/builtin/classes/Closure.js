/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

module.exports = function (internals) {
    function Closure() {

    }

    _.extend(Closure.prototype, {
        '__invoke': function () {
            return this.invokeClosure([].slice.call(arguments));
        }
    });

    internals.disableAutoCoercion();

    return Closure;
};
