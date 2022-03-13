/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = function (internals) {
    var iniState = internals.iniState,
        valueFactory = internals.valueFactory;

    return {
        /**
         * Fetches the value of a PHP configuration option.
         * Any changes made at runtime (eg. with ini_set(...)) will be taken into account.
         *
         * @see {@link https://secure.php.net/manual/en/function.ini-get.php}
         *
         * @param {Value} optionNameValue
         * @returns {Value}
         */
        'ini_get': internals.typeFunction('string $option', function (optionNameValue) {
            // TODO: Add return type above once union types are supported.
            var optionName = optionNameValue.getNative(),
                optionValue = iniState.get(optionName);

            if (optionValue === null) {
                // Indicate that the option is not defined with bool(false)
                return valueFactory.createBoolean(false);
            }

            return valueFactory.coerce(optionValue);
        }),

        /**
         * Sets the value of a defined PHP configuration option at runtime,
         * returning its previous value.
         * If the option does not exist, false will be returned.
         *
         * @see {@link https://secure.php.net/manual/en/function.ini-set.php}
         *
         * @param {Value} optionNameValue
         * @param {Value} optionValue
         * @returns {Value}
         */
        'ini_set': internals.typeFunction('string $option, mixed $value', function (optionNameValue, optionValue) {
            // TODO: Add return type above once union types are supported.
            var optionName = optionNameValue.getNative(),
                previousOptionValue = iniState.get(optionName);

            if (previousOptionValue === null) {
                // Indicate that the option is not defined with bool(false)
                return valueFactory.createBoolean(false);
            }

            iniState.set(optionName, optionValue.getNative());

            return valueFactory.coerce(previousOptionValue);
        })
    };
};
