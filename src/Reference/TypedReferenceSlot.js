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
    ReferenceSlot = require('./ReferenceSlot'),

    CANNOT_ASSIGN_INCOMPATIBLE_REFERENCE_TYPE = 'core.cannot_assign_incompatible_reference_type',
    ERROR_IN_FILE = 'core.error_in_file';

/**
 * A reference slot that enforces a property type constraint on write,
 * used when a typed instance property is accessed by reference.
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {CallStack} callStack
 * @param {Flow} flow
 * @param {Class} classObject
 * @param {string} propertyName
 * @param {TypeInterface} typeObject
 * @param {Value|null} initialValue Pre-validated value to store without type-checking, or null for PHP NULL.
 * @constructor
 */
function TypedReferenceSlot(
    valueFactory,
    referenceFactory,
    futureFactory,
    callStack,
    flow,
    classObject,
    propertyName,
    typeObject,
    initialValue
) {
    ReferenceSlot.call(this, valueFactory, referenceFactory, futureFactory, flow);

    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {Class}
     */
    this.classObject = classObject;
    /**
     * @type {string}
     */
    this.propertyName = propertyName;
    /**
     * @type {TypeInterface}
     */
    this.typeObject = typeObject;

    if (initialValue) {
        // Bypass type checking for pre-validated initial values (e.g. existing property value).
        this.value = initialValue;
    }
}

util.inherits(TypedReferenceSlot, ReferenceSlot);

_.extend(TypedReferenceSlot.prototype, {
    /**
     * {@inheritdoc}
     */
    setValue: function (value) {
        var slot = this;

        return slot.typeObject.allowsValue(value).next(function (allowed) {
            if (!allowed) {
                slot.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    CANNOT_ASSIGN_INCOMPATIBLE_REFERENCE_TYPE,
                    {
                        className: slot.classObject.getName(),
                        propertyName: slot.propertyName,
                        expectedType: slot.typeObject.getDisplayName(),
                        actualType: value.getDisplayType()
                    },
                    'TypeError',
                    undefined,
                    undefined,
                    undefined,
                    ERROR_IN_FILE,
                    {
                        filePath: slot.callStack.getLastFilePath(),
                        lineNumber: slot.callStack.getLastLine()
                    }
                );
            }

            slot.value = value;

            return value;
        });
    }
});

module.exports = TypedReferenceSlot;
