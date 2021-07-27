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
 * Provides the core runtime API that the JS output by the transpiler calls into
 *
 * @param {ValueFactory} valueFactory
 * @param {Scope} topLevelScope
 * @constructor
 */
function Core(valueFactory, topLevelScope) {
    /**
     * A single shared BooleanValue of value false. Saves on function calls and memory consumption
     * over transpiling to "createBoolean(false)".
     *
     * @type {BooleanValue}
     * @public
     */
    this.falseValue = valueFactory.createBoolean(false);
    /**
     * A single shared NullValue. Saves on function calls and memory consumption
     * over transpiling to "createNull()".
     *
     * @type {NullValue}
     * @public
     */
    this.nullValue = valueFactory.createNull();
    /**
     * @type {Scope}
     * @public
     */
    this.scope = topLevelScope;
    /**
     * A single shared BooleanValue of value true. See note above re. falseValue.
     *
     * @type {BooleanValue}
     * @public
     */
    this.trueValue = valueFactory.createBoolean(true);
}

_.extend(Core.prototype, {

});

module.exports = Core;
