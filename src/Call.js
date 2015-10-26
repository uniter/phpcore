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

function Call(scope) {
    this.scope = scope;
}

_.extend(Call.prototype, {
    getScope: function () {
        return this.scope;
    }
});

module.exports = Call;
