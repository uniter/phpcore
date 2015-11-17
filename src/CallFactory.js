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

function CallFactory(Call) {
    this.Call = Call;
}

_.extend(CallFactory.prototype, {
    create: function (scope) {
        var factory = this;

        return new factory.Call(scope);
    }
});

module.exports = CallFactory;
