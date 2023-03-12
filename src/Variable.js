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
    require('lie'),
    require('phpcommon')
], function (
    _,
    Promise,
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
     * @param {Flow} flow
     * @param {string} name
     * @constructor
     * @implements {ChainableInterface}
     */
    function Variable(
        callStack,
        valueFactory,
        referenceFactory,
        futureFactory,
        flow,
        name
    ) {
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {Flow}
         */
        this.flow = flow;
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
         * Returns the value of this variable, suitable for use as an array element.
         * Note that Future-wrapped Values will be returned unchanged ready to be awaited.
         *
         * @returns {ChainableInterface<Value>}
         */
        asArrayElement: function () {
            return this.getValue().getForAssignment();
        },

        /**
         * Returns a Future that will resolve to the native value of this variable.
         *
         * @returns {FutureInterface<*>}
         */
        asEventualNative: function () {
            return this.getValue().next(function (value) {
                return value.asEventualNative();
            });
        },

        /**
         * {@inheritdoc}
         */
        asValue: function () {
            return this.getValue();
        },

        /**
         * Clears any reference this variable may have assigned.
         */
        clearReference: function () {
            this.reference = null;
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
         * then the value of the reference will be fetched.
         *
         * @returns {ChainableInterface<Value>}
         */
        getValue: function () {
            var variable = this;

            if (variable.value) {
                return variable.value;
            }

            if (variable.reference) {
                return variable.reference.getValue();
            }

            return variable.raiseUndefined();
        },

        /**
         * Returns this variable's value if defined, null otherwise.
         * No notice/warning will be raised if the variable has no value defined.
         *
         * Note that unlike .getValueOrNull(), native null is returned if not defined.
         *
         * @returns {Value|null}
         */
        getValueOrNativeNull: function () {
            var variable = this;

            return variable.isDefined() ? variable.getValue() : null;
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
         * Note that if its value is a pending Future, an error will be raised.
         *
         * @returns {*}
         */
        getNative: function () {
            return this.getValue().yieldSync().getNative();
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
                variable.reference.setValue(variable.value).yieldSync();
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
         * @returns {FutureInterface<boolean>}
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
         * {@inheritdoc}
         */
        isFuture: function () {
            return false;
        },

        /**
         * Determines whether this variable is readable.
         * Some values may be undefined but still readable, e.g. overloaded properties using __get(...).
         *
         * @returns {boolean}
         */
        isReadable: function () {
            return this.isDefined();
        },

        /**
         * Determines whether this variable has a reference rather than value assigned.
         *
         * @return {boolean}
         */
        isReference: function () {
            return Boolean(this.reference);
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
         * @returns {FutureInterface<boolean>}
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
         * {@inheritdoc}
         */
        next: function (resolveHandler) {
            var variable = this,
                result;

            if (!resolveHandler) {
                return variable;
            }

            try {
                result = resolveHandler(variable);
            } catch (error) {
                return variable.futureFactory.createRejection(error);
            }

            result = variable.flow.chainify(result);

            return result;
        },

        /**
         * Raises an error for when this variable is not defined.
         *
         * @returns {NullValue}
         */
        raiseUndefined: function () {
            var variable = this;

            if (variable.name === 'this') {
                variable.callStack.raiseTranslatedError(PHPError.E_ERROR, USED_THIS_OUTSIDE_OBJECT_CONTEXT);
            }

            // FIXME: Should now be a warning.
            variable.callStack.raiseError(PHPError.E_NOTICE, 'Undefined variable: ' + variable.name);

            return variable.valueFactory.createNull();
        },

        /**
         * Sets the value of this variable. If it holds a value directly
         * this will be overwritten, otherwise if it is a reference to another
         * variable or reference (array element/object property etc.)
         * then the value of the reference will be changed instead.
         * Returns the value that was assigned.
         *
         * @param {Value} value
         * @returns {ChainableInterface<Value>}
         */
        setValue: function (value) {
            var assignedValue,
                variable = this;

            if (variable.name === 'this' && value.getType() === 'null') {
                // Normalise the value of $this to either be set to an ObjectValue
                // or be unset
                variable.value = null;

                return value;
            }

            if (variable.reference) {
                // Note that we don't call .getForAssignment() here as the eventual reference will do so.
                return variable.reference.setValue(value);
            }

            assignedValue = value.getForAssignment();
            variable.value = assignedValue;

            return assignedValue;
        },

        /**
         * Changes this variable to refer to a reference rather than contain a value itself,
         * or changes the target reference if it already has one.
         *
         * @param {Reference} reference
         * @returns {Variable}
         */
        setReference: function (reference) {
            var variable = this;

            if (variable.reference && variable.reference.hasReferenceSetter()) {
                // Current reference itself intercepts further reference assignments.
                variable.reference.setReference(reference);

                return variable;
            }

            variable.reference = reference;
            variable.value = null;

            return variable;
        },

        /**
         * Derives a promise of this variable (shared interface with Future).
         *
         * @returns {Promise<Variable>}
         */
        toPromise: function () {
            return Promise.resolve(this);
        },

        /**
         * Unsets the value or reference of this variable, if any.
         *
         * @returns {Future}
         */
        unset: function () {
            var variable = this;

            variable.value = variable.reference = null;

            return variable.futureFactory.createPresent(null);
        },

        /**
         * {@inheritdoc}
         */
        yieldSync: function () {
            return this;
        }
    });

    return Variable;
}, {strict: true});
