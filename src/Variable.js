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
    require('phpcommon'),
    require('./Reference/ReferenceSlot')
], function (
    _,
    phpCommon,
    ReferenceSlot
) {
    var USED_THIS_OUTSIDE_OBJECT_CONTEXT = 'core.used_this_outside_object_context',
        PHPError = phpCommon.PHPError;

    /**
     * Variables can either hold a value directly or hold a pointer
     * to a reference (an array element, object instance property or static class property etc.)
     *
     * @param {CallStack} callStack
     * @param {ValueFactory} valueFactory
     * @param {string} name
     * @constructor
     */
    function Variable(callStack, valueFactory, name) {
        /**
         * @type {string}
         */
        this.name = name;
        /**
         * @type {Reference|null}
         */
        this.reference = null;
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
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
         * Coerces this value and the specified one to strings,
         * concatenates them together and then assigns the result back to this variable
         *
         * @param {Value} rightValue
         */
        concatWith: function (rightValue) {
            var variable = this;

            variable.setValue(variable.getValue().concat(rightValue));
        },

        decrementBy: function (rightValue) {
            var variable = this;

            variable.setValue(variable.getValue().subtract(rightValue));
        },

        /**
         * Divides the value of this variable by the specified value
         *
         * Used by the `/=` operator
         *
         * @param {Value} rightValue
         */
        divideBy: function (rightValue) {
            var variable = this;

            variable.setValue(variable.getValue().divide(rightValue));
        },

        /**
         * Formats the variable (which may not be defined) for display in stack traces etc.
         *
         * @returns {string}
         */
        formatAsString: function () {
            var variable = this;

            return variable.isDefined() ?
                variable.getValue().formatAsString() :
                'NULL';
        },

        /**
         * Fetches a property of an object stored in this variable
         *
         * @param {Value} nameValue
         * @returns {PropertyReference}
         */
        getInstancePropertyByName: function (nameValue) {
            var variable = this;

            if (variable.name === 'this' && variable.value === null) {
                variable.callStack.raiseTranslatedError(PHPError.E_ERROR, USED_THIS_OUTSIDE_OBJECT_CONTEXT);
            }

            return variable.getValue().getInstancePropertyByName(nameValue);
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
            variable.reference = new ReferenceSlot(variable.valueFactory);

            if (variable.value) {
                variable.reference.setValue(variable.value);
                variable.value = null; // This variable now has a reference (to the slot) and not a value
            }

            return variable.reference;
        },

        incrementBy: function (rightValue) {
            var variable = this;

            variable.setValue(variable.getValue().add(rightValue));
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
         * @returns {boolean}
         */
        isEmpty: function () {
            var variable = this;

            return !variable.isDefined() || variable.getValue().isEmpty();
        },

        /**
         * Determines whether this variable is classed as "set" or not
         *
         * @returns {boolean}
         */
        isSet: function () {
            var variable = this;

            return variable.isDefined() && variable.getValue().isSet();
        },

        /**
         * Multiplies the value of this variable by the specified value
         *
         * Used by the `*=` operator
         *
         * @param {Value} rightValue
         */
        multiplyBy: function (rightValue) {
            var variable = this;

            variable.setValue(variable.getValue().multiply(rightValue));
        },

        /**
         * Decrements the stored value, returning its original value
         *
         * @returns {Value}
         */
        postDecrement: function () {
            var variable = this,
                decrementedValue = variable.getValue().decrement(),
                result = variable.getValue();

            if (decrementedValue) {
                variable.setValue(decrementedValue);
            }

            return result;
        },

        /**
         * Decrements the stored value, returning its new value
         *
         * @returns {Value}
         */
        preDecrement: function () {
            var variable = this,
                decrementedValue = variable.getValue().decrement();

            if (decrementedValue) {
                variable.setValue(decrementedValue);
            }

            return variable.getValue();
        },

        /**
         * Increments the stored value, returning its original value
         *
         * @returns {Value}
         */
        postIncrement: function () {
            var variable = this,
                incrementedValue = variable.getValue().increment(),
                result = variable.getValue();

            if (incrementedValue) {
                variable.setValue(incrementedValue);
            }

            return result;
        },

        /**
         * Increments the stored value, returning its new value
         *
         * @returns {Value}
         */
        preIncrement: function () {
            var variable = this,
                incrementedValue = variable.getValue().increment();

            if (incrementedValue) {
                variable.setValue(incrementedValue);
            }

            return variable.getValue();
        },

        /**
         * Sets either the value or the reference of this variable depending on the argument provided
         *
         * @param {Reference|Value|Variable} referenceOrValue
         */
        setReferenceOrValue: function (referenceOrValue) {
            var variable = this;

            if (variable.valueFactory.isValue(referenceOrValue)) {
                variable.setValue(referenceOrValue);
            } else {
                variable.setReference(referenceOrValue.getReference());
            }
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

            if (variable.name === 'this' && value.getType() === 'null') {
                // Normalise the value of $this to either be set to an ObjectValue
                // or be unset
                variable.value = null;

                return value;
            }

            if (variable.reference) {
                variable.reference.setValue(value);
            } else {
                variable.value = value.getForAssignment();
            }

            return value;
        },

        setReference: function (reference) {
            var variable = this;

            variable.reference = reference;
            variable.value = null;

            return variable;
        },

        toArray: function () {
            return this.value.toArray();
        },

        toBoolean: function () {
            return this.value.toBoolean();
        },

        toFloat: function () {
            return this.value.toFloat();
        },

        toInteger: function () {
            return this.value.toInteger();
        },

        unset: function () {
            var variable = this;

            variable.value = variable.reference = null;
        }
    });

    return Variable;
}, {strict: true});
