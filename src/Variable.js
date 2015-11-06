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
    var PHPError = phpCommon.PHPError;

    function Variable(callStack, valueFactory, name) {
        this.name = name;
        this.reference = null;
        this.callStack = callStack;
        this.value = null;
        this.valueFactory = valueFactory;
    }

    _.extend(Variable.prototype, {
        decrementBy: function (rightValue) {
            var variable = this;

            variable.setValue(variable.getValue().subtract(rightValue));
        },

        getValue: function () {
            var variable = this;

            if (variable.value) {
                return variable.value;
            }

            if (variable.reference) {
                return variable.reference.getValue();
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

        toValue: function () {
            return this.getValue();
        },

        unwrapForJS: function () {
            var value = this;

            return value.value ? value.value.unwrapForJS() : null;
        }
    });

    return Variable;
}, {strict: true});
