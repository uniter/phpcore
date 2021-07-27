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
 * @param {class} Core
 * @param {ValueFactory} valueFactory
 * @param {CoreBinder} coreBinder
 * @constructor
 */
function CoreFactory(Core, valueFactory, coreBinder) {
    /**
     * @type {class}
     */
    this.Core = Core;
    /**
     * @type {CoreBinder}
     */
    this.coreBinder = coreBinder;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(CoreFactory.prototype, {
    /**
     * Creates a new Core
     *
     * @param {Scope} topLevelScope
     * @returns {Core}
     */
    createCore: function (topLevelScope) {
        var factory = this,
            core = new factory.Core(factory.valueFactory, topLevelScope);

        return factory.coreBinder.bindCore(core);
    }
});

module.exports = CoreFactory;
