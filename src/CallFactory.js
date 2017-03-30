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
 * @param {class} Call
 * @constructor
 */
function CallFactory(Call) {
    /**
     * @type {class}
     */
    this.Call = Call;
}

_.extend(CallFactory.prototype, {
    /**
     * Creates a new Call
     *
     * @param {Scope} scope
     * @param {NamespaceScope} namespaceScope
     * @param {Value[]|null} args
     * @param {Class|null} newStaticClass
     * @returns {Call}
     */
    create: function (scope, namespaceScope, args, newStaticClass) {
        var factory = this;

        return new factory.Call(scope, namespaceScope, args || [], newStaticClass || null);
    }
});

module.exports = CallFactory;
