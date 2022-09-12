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
    PHPError = phpCommon.PHPError,
    Reference = require('./Reference'),

    UNDECLARED_STATIC_PROPERTY = 'core.undeclared_static_property',

    throwUndeclaredStaticPropertyAccessFatalError = function (reference) {
        reference.callStack.raiseTranslatedError(PHPError.E_ERROR, UNDECLARED_STATIC_PROPERTY, {
            className: reference.classObject.name,
            propertyName: reference.name
        });
    };

/**
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {CallStack} callStack
 * @param {Class} classObject
 * @param {string} name Name of the static property
 * @constructor
 */
function UndeclaredStaticPropertyReference(
    valueFactory,
    referenceFactory,
    futureFactory,
    callStack,
    classObject,
    name
) {
    Reference.call(this, referenceFactory);

    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {Class}
     */
    this.classObject = classObject;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {string}
     */
    this.name = name;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

util.inherits(UndeclaredStaticPropertyReference, Reference);

_.extend(UndeclaredStaticPropertyReference.prototype, {
    /**
     * Fetches the name of this undeclared property
     *
     * @returns {string}
     */
    getName: function () {
        return this.name;
    },

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
     * Determines whether this reference is defined
     *
     * @returns {boolean}
     */
    isDefined: function () {
        return false;
    },

    /**
     * Undeclared properties are classed as empty
     *
     * @returns {Future<boolean>}
     */
    isEmpty: function () {
        return this.futureFactory.createPresent(true);
    },

    /**
     * {@inheritdoc}
     */
    isReference: function () {
        return false;
    },

    /**
     * Undeclared properties are classed as unset
     *
     * @returns {Future<boolean>}
     */
    isSet: function () {
        return this.futureFactory.createPresent(false);
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
