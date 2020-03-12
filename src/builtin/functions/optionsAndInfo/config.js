/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var phpCommon = require('phpcommon'),
    PHPError = phpCommon.PHPError;

module.exports = function (internals) {
    var callStack = internals.callStack,
        iniState = internals.iniState,
        valueFactory = internals.valueFactory;

    return {
        /**
         * Fetches the value of a PHP configuration option.
         * Any changes made at runtime (eg. with ini_set(...)) will be taken into account.
         *
         * @see {@link https://secure.php.net/manual/en/function.ini-get.php}
         *
         * @param {Reference|Value|Variable} optionNameReference
         * @returns {Value}
         */
        'ini_get': function (optionNameReference) {
            var optionName,
                optionValue;

            if (arguments.length !== 1) {
                callStack.raiseError(
                    PHPError.E_WARNING,
                    'ini_get() expects exactly 1 parameter, ' + arguments.length + ' given'
                );

                return valueFactory.createNull();
            }

            optionName = optionNameReference.getValue().getNative();
            optionValue = iniState.get(optionName);

            if (optionValue === null) {
                // Indicate that the option is not defined with bool(false)
                return valueFactory.createBoolean(false);
            }

            return valueFactory.coerce(optionValue);
        },

        /**
         * Sets the value of a defined PHP configuration option at runtime,
         * returning its previous value.
         * If the option does not exist, false will be returned.
         *
         * @see {@link https://secure.php.net/manual/en/function.ini-set.php}
         *
         * @param {Reference|Value|Variable} optionNameReference
         * @param {Reference|Value|Variable} optionValueReference
         * @returns {Value}
         */
        'ini_set': function (optionNameReference, optionValueReference) {
            var previousOptionValue,
                optionName,
                optionValue;

            if (arguments.length !== 2) {
                callStack.raiseError(
                    PHPError.E_WARNING,
                    'ini_set() expects exactly 2 parameters, ' + arguments.length + ' given'
                );

                return valueFactory.createNull();
            }

            optionName = optionNameReference.getValue().getNative();
            previousOptionValue = iniState.get(optionName);

            if (previousOptionValue === null) {
                // Indicate that the option is not defined with bool(false)
                return valueFactory.createBoolean(false);
            }

            optionValue = optionValueReference.getValue().getNative();

            iniState.set(optionName, optionValue);

            return valueFactory.coerce(previousOptionValue);
        }
    };
};
