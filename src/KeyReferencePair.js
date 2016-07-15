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

function KeyReferencePair(key, reference) {
    this.key = key;
    this.reference = reference;
}

_.extend(KeyReferencePair.prototype, {
    getKey: function () {
        return this.key;
    },

    getReference: function () {
        return this.reference;
    }
});

module.exports = KeyReferencePair;
