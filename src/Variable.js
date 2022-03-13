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
    require('phpcommon')
], function (
    _,
    phpCommon
) {
    var USED_THIS_OUTSIDE_OBJECT_CONTEXT = 'core.used_this_outside_object_context',
        PHPError = phpCommon.PHPError;

    /**
     * Variables can either hold a value directly or hold a pointer
     * to a reference (an array element, object instance property or static class property etc.)
     *
     * @param {CallStack} callStack
     * @param {ValueFactory} valueFactory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {string} name
     * @constructor
     */
    function Variable(
        callStack,
        valueFactory,
        referenceFactory,
        futureFactory,
        name
    ) {
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {FutureFactory}
         */
        this.futureFactory = futureFactory;
        /**
         * @type {string}
         */
        this.name = name;
        /**
         * @type {Reference|null}
         */
        this.reference = null;
        /**
         * @type {ReferenceFactory}
         */
        this.referenceFactory = referenceFactory;
        /**
         * @type {Value|null}
         */
        this.value = null;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(Variable.prototype, {
        /**
         * Formats the variable (which may not be defined) for display in stack traces etc.
         *
         * @returns {string}
         */
        formatAsString: function () {
            var variable = this;

            return variable.isDefined() ?
                // TODO: Handle async pause with Flow
                variable.getValue().formatAsString() :
                'NULL';
        },

        /**
         * Fetches the name of this variable, which must be unique within its scope
         *
         * @returns {string}
         */
        getName: function () {
            return this.name;
        },

        /**
         * Fetches the value of this variable. If it holds a value directly
         * this will be returned, otherwise if it is a reference to another
         * variable or reference (array element/object property etc.)
         * then the value of the reference will be fetched
         *
         * @returns {Value}
         */
        getValue: function () {
            var variable = this;

            if (variable.value) {
                return variable.value;
            }

            if (variable.reference) {
                return variable.reference.getValue();
            }

            if (variable.name === 'this') {
                variable.callStack.raiseTranslatedError(PHPError.E_ERROR, USED_THIS_OUTSIDE_OBJECT_CONTEXT);
            }

            variable.callStack.raiseError(PHPError.E_NOTICE, 'Undefined variable: ' + variable.name);

            return variable.valueFactory.createNull();
        },

        /**
         * Returns this variable's value if defined, NULL otherwise.
         * No notice/warning will be raised if the variable has no value defined.
         *
         * @return {Value}
         */
        getValueOrNull: function () {
            var variable = this;

            return variable.isDefined() ?
                variable.getValue() :
                variable.valueFactory.createNull();
        },

        /**
         * Fetches the native value for the value or reference of this variable.
         * Note that if its value is a pending FutureValue, an error will be raised.
         *
         * @returns {*}
         */
        getNative: function () {
            return this.getValue().getNative();
        },

        /**
         * Fetches a reference to this variable's value
         *
         * @returns {Reference}
         */
        getReference: function () {
            var variable = this;

            if (variable.reference) {
                // This variable already refers to something else, so return its target
                return variable.reference;
            }

            // Implicitly define a "slot" to contain this variable's value
            variable.reference = variable.referenceFactory.createReferenceSlot();

            if (variable.value) {
                variable.reference.setValue(variable.value);
                variable.value = null; // This variable now has a reference (to the slot) and not a value
            }

            return variable.reference;
        },

        /**
         * Determines whether this variable is defined,
         * either with a value directly assigned or by being
         * a reference to another variable/reference
         *
         * @returns {boolean}
         */
        isDefined: function () {
            var variable = this;

            return !!(variable.value || variable.reference);
        },

        /**
         * Determines whether this variable is classed as "empty" or not
         *
         * @returns {Future<boolean>}
         */
        isEmpty: function () {
            var variable = this;

            if (variable.value) {
                // Variable has a value - check the value for emptiness
                return variable.value.isEmpty();
            }

            if (variable.reference) {
                // Variable has a reference - check the reference for emptiness
                return variable.reference.isEmpty();
            }

            // Otherwise the variable is undefined, so it is empty
            return variable.futureFactory.createPresent(true);
        },

        /**
         * Determines whether this variable may be referenced (shared interface with Reference and Value).
         *
         * @returns {boolean}
         */
        isReferenceable: function () {
            return true;
        },

        /**
         * Determines whether this variable is classed as "set" or not
         *
         * @returns {Future<boolean>}
         */
        isSet: function () {
            var variable = this;

            if (variable.value) {
                // Variable has a value - check the value for emptiness
                return variable.value.isSet();
            }

            if (variable.reference) {
                // Variable has a reference - check the reference for emptiness
                return variable.reference.isSet();
            }

            // Otherwise the variable is undefined, so it is not set
            return variable.futureFactory.createPresent(false);
        },

        /**
         * Sets the value of this variable. If it holds a value directly
         * this will be overwritten, otherwise if it is a reference to another
         * variable or reference (array element/object property etc.)
         * then the value of the reference will be changed instead.
         * Returns the value that was assigned
         *
         * @param {Reference|Value} value
         * @returns {Value}
         */
        setValue: function (value) {
            var variable = this;

            return value
                .next(function (presentValue) {
                    if (variable.name === 'this' && presentValue.getType() === 'null') {
                        // Normalise the value of $this to either be set to an ObjectValue
                        // or be unset
                        variable.value = null;

                        return presentValue;
                    }

                    if (variable.reference) {
                        variable.reference.setValue(presentValue);
                    } else {
                        variable.value = presentValue.getForAssignment();
                    }

                    return presentValue;
                })
                .asValue();
        },

        setReference: function (reference) {
            var variable = this;

            variable.reference = reference;
            variable.value = null;

            return variable;
        },

        unset: function () {
            var variable = this;

            variable.value = variable.reference = null;
        }
    });

    return Variable;
}, {strict: true});
