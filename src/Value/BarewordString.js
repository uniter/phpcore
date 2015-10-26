/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pausable').executeSync([require], function (require) {
    var _ = require('microdash'),
        util = require('util'),
        StringValue = require('./String');

    function BarewordStringValue(factory, callStack, value) {
        StringValue.call(this, factory, callStack, value);
    }

    util.inherits(BarewordStringValue, StringValue);

    _.extend(BarewordStringValue.prototype, {
        call: function (args, namespaceOrNamespaceScope) {
            return namespaceOrNamespaceScope.getFunction(this.value).apply(null, args);
        }
    });

    return BarewordStringValue;
}, {strict: true});
