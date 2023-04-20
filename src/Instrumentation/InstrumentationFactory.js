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
 * Creates instrumentation objects.
 *
 * @param {class} CallInstrumentation
 * @constructor
 */
function InstrumentationFactory(CallInstrumentation) {
    /**
     * @type {class}
     */
    this.CallInstrumentation = CallInstrumentation;
}

_.extend(InstrumentationFactory.prototype, {
    /**
     * Creates a new CallInstrumentation.
     *
     * @param {Function|null} finder
     * @returns {CallInstrumentation}
     */
    createCallInstrumentation: function (finder) {
        return new this.CallInstrumentation(finder);
    }
});

module.exports = InstrumentationFactory;
