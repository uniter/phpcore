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
    function stdClass() {

    }

    internals.disableAutoCoercion();

    internals.defineUnwrapper(function () {
        // When exporting via the public FFI API, unwrap stdClass instances to a plain object
        // with native property values
        var objectValue = this,
            result = {};

        _.forOwn(objectValue.getNonPrivateProperties(), function (propertyValue, propertyName) {
            result[propertyName] = propertyValue.getNative();
        });

        return result;
    });

    return stdClass;
};
