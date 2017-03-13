/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    phpCommon = require('phpcommon'),
    util = require('util'),
    PHPFatalError = phpCommon.PHPFatalError,
    Reference = require('./Reference'),
    throwUndeclaredStaticPropertyAccessFatalError = function (reference) {
        throw new PHPFatalError(PHPFatalError.UNDECLARED_STATIC_PROPERTY, {
            className: reference.classObject.name,
            propertyName: reference.name
        });
    };

/**
 * @param {Class} classObject
 * @param {string} name Name of the static property
 * @constructor
 */
function UndeclaredStaticPropertyReference(classObject, name) {
    /**
     * @type {Class}
     */
    this.classObject = classObject;
    /**
     * @type {string}
     */
    this.name = name;
}

util.inherits(UndeclaredStaticPropertyReference, Reference);

_.extend(UndeclaredStaticPropertyReference.prototype, {
    /**
     * Undeclared properties cannot be accessed, only checked for empty or set state
     *
     * @throws (PHPFatalError}
     */
    getReference: function () {
        throwUndeclaredStaticPropertyAccessFatalError(this);
    },

    /**
     * Undeclared properties cannot be accessed, only checked for empty or set state
     *
     * @throws (PHPFatalError}
     */
    getValue: function () {
        throwUndeclaredStaticPropertyAccessFatalError(this);
    },

    /**
     * Undeclared properties are classed as empty
     *
     * @returns {boolean}
     */
    isEmpty: function () {
        return true;
    },

    /**
     * Undeclared properties are classed as unset
     *
     * @returns {boolean}
     */
    isSet: function () {
        return false;
    },

    /**
     * Undeclared properties cannot be accessed, only checked for empty or set state
     *
     * @throws (PHPFatalError}
     */
    setValue: function () {
        throwUndeclaredStaticPropertyAccessFatalError(this);
    }
});

module.exports = UndeclaredStaticPropertyReference;
