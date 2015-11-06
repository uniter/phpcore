/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash'),
    require('./Reference/Null')
], function (
    _,
    NullReference
) {
    function ReferenceFactory(valueFactory) {
        this.valueFactory = valueFactory;
    }

    _.extend(ReferenceFactory.prototype, {
        createNull: function () {
            return new NullReference(this.valueFactory);
        }
    });

    return ReferenceFactory;
}, {strict: true});
