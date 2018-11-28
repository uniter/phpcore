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
    require('./Reference/Variable')
], function (
    _,
    phpCommon,
    VariableReference
) {
    var PHPError = phpCommon.PHPError,
        PHPFatalError = phpCommon.PHPFatalError;

    /**
     * Variables can either hold a value directly or hold a pointer
     * to a reference (an array element or an instance or static object property etc.)
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

        getInstancePropertyByName: function (name) {
            var variable = this;

            if (
                variable.name === 'this' &&
                (variable.value === null || variable.value.getType() === 'null')
            ) {
                throw new PHPFatalError(PHPFatalError.USED_THIS_OUTSIDE_OBJECT_CONTEXT);
            }

            return variable.getValue().getInstancePropertyByName(name);
        },

        /**
         * Fetches the name of this variable, which must be unique within its scope
         *
         * @return {string}
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

            if (
                variable.name === 'this' &&
                (variable.value === null || variable.value.getType() === 'null')
            ) {
                throw new PHPFatalError(PHPFatalError.USED_THIS_OUTSIDE_OBJECT_CONTEXT);
            }

            variable.callStack.raiseError(PHPError.E_NOTICE, 'Undefined variable: ' + variable.name);

            return variable.valueFactory.createNull();
        },

        getNative: function () {
            return this.getValue().getNative();
        },

        getReference: function () {
            return new VariableReference(this);
        },

        incrementBy: function (rightValue) {
            var variable = this;

            variable.setValue(variable.getValue().add(rightValue));
        },

        isDefined: function () {
            var variable = this;

            return variable.value || variable.reference;
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

        postDecrement: function () {
            var variable = this,
                decrementedValue = variable.value.decrement(),
                result = variable.value;

            if (decrementedValue) {
                variable.value = decrementedValue;
            }

            return result;
        },

        preDecrement: function () {
            var variable = this,
                decrementedValue = variable.value.decrement();

            if (decrementedValue) {
                variable.value = decrementedValue;
            }

            return variable.value;
        },

        postIncrement: function () {
            var variable = this,
                incrementedValue = variable.value.increment(),
                result = variable.value;

            if (incrementedValue) {
                variable.value = incrementedValue;
            }

            return result;
        },

        preIncrement: function () {
            var variable = this,
                incrementedValue = variable.value.increment();

            if (incrementedValue) {
                variable.value = incrementedValue;
            }

            return variable.value;
        },

        /**
         * Sets the value of this variable. If it holds a value directly
         * this will be overwritten, otherwise if it is a reference to another
         * variable or reference (array element/object property etc.)
         * then the value of the reference will be changed instead.
         * Returns the value that was assigned
         *
         * @param {Reference|Value} value
         * @return {Value}
         */
        setValue: function (value) {
            var variable = this;

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
