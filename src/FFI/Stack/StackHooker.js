/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * @param {GlobalStackHooker} globalStackHooker
 * @param {OptionSet} optionSet
 * @constructor
 */
function StackHooker(globalStackHooker, optionSet) {
    /**
     * @type {GlobalStackHooker}
     */
    this.globalStackHooker = globalStackHooker;
    /**
     * @type {OptionSet}
     */
    this.optionSet = optionSet;
}

_.extend(StackHooker.prototype, {
    /**
     * Detects whether native stack cleaning is enabled, installing the relevant hooks if so
     */
    hook: function () {
        var hooker = this,
            // TODO: Consider defaulting to on (opt-out) once stable
            stackCleaningEnabled = hooker.optionSet.getOption('stackCleaning') === true;

        if (stackCleaningEnabled) {
            hooker.globalStackHooker.hook();
        }
    }
});

module.exports = StackHooker;
