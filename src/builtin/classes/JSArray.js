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
    var valueFactory = internals.valueFactory;

    function JSArray() {

    }

    // Use ArrayAccess to allow for native JS array semantics (no copy-on-assignment)
    internals.implement('ArrayAccess');

    // TODO: Implement __get and __set so custom props get set on the native JS Array instance?
    // TODO: Merge with JSObject?
    _.extend(JSArray.prototype, {
        /**
         * ...
         *
         * @param {Value} offsetValue
         * @returns {BooleanValue}
         */
        'offsetExists': function (offsetValue) {
            var nativeArray = this.getObject(),
                offset = offsetValue.getNative();

            return valueFactory.createBoolean(isFinite(offset) && offset >= 0 && offset < nativeArray.length);
        },

        /**
         * ...
         *
         * @param {Value} offsetValue
         * @returns {*}
         */
        'offsetGet': function (offsetValue) {
            var nativeArray = this.getObject(),
                offset = offsetValue.getNative();

            return nativeArray[offset];
        },

        /**
         * ...
         *
         * @param {Value} offsetValue
         * @param {Value} value
         */
        'offsetSet': function (offsetValue, value) {
            var nativeArray = this.getObject(),
                offset = offsetValue.getNative(),
                nativeValue = value.getNative();

            if (offset === null) {
                nativeArray.push(nativeValue);
            } else {
                nativeArray[offset] = nativeValue;
            }
        },

        /**
         * ...
         *
         * @param {Value} offsetValue
         */
        'offsetUnset': function (offsetValue) {
            var nativeArray = this.getObject(),
                offset = offsetValue.getNative();

            delete nativeArray[offset];
        }
    });

    internals.defineUnwrapper(function (objectValue) {
        /*
         * JSArrays are arrays that originate from JS-land and were subsequently passed into PHP-land -
         * when we want to unwrap them to pass back to JS-land, simply return the original native array
         */
        return objectValue.getObject();
    });

    internals.disableAutoCoercion();

    return JSArray;
};
