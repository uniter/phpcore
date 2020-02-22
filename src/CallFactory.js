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
 * @param {class} FFICall
 * @constructor
 */
function CallFactory(Call, FFICall) {
    /**
     * @type {class}
     */
    this.Call = Call;
    /**
     * @type {class}
     */
    this.FFICall = FFICall;
}

_.extend(CallFactory.prototype, {
    /**
     * Creates a new Call
     *
     * @param {Scope} scope
     * @param {NamespaceScope} namespaceScope
     * @param {Reference[]|Value[]|Variable[]|=} args
     * @param {Class|null} newStaticClass
     * @returns {Call}
     */
    create: function (scope, namespaceScope, args, newStaticClass) {
        var factory = this;

        return new factory.Call(scope, namespaceScope, args || [], newStaticClass || null);
    },

    /**
     * Creates a new FFI Call
     *
     * @param {Reference[]|Value[]|Variable[]|=} args
     */
    createFFICall: function (args) {
        var factory = this;

        return new factory.FFICall(args || []);
    }
});

module.exports = CallFactory;
