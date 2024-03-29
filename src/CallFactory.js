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
 * @param {InstrumentationFactory} instrumentationFactory
 * @constructor
 */
function CallFactory(Call, FFICall, instrumentationFactory) {
    /**
     * @type {class}
     */
    this.Call = Call;
    /**
     * Injected by .setControlFactory(...)
     *
     * @type {ControlFactory|null}
     */
    this.controlFactory = null;
    /**
     * @type {class}
     */
    this.FFICall = FFICall;
    /**
     * @type {InstrumentationFactory}
     */
    this.instrumentationFactory = instrumentationFactory;
}

_.extend(CallFactory.prototype, {
    /**
     * Creates a new Call.
     *
     * @param {Scope} scope
     * @param {NamespaceScope} namespaceScope
     * @param {Value[]=} args
     * @param {Class|null} newStaticClass
     * @returns {Call}
     */
    create: function (scope, namespaceScope, args, newStaticClass) {
        var factory = this,
            trace = factory.controlFactory.createTrace();

        return new factory.Call(
            scope,
            namespaceScope,
            trace,
            factory.instrumentationFactory,
            args || [],
            newStaticClass || null
        );
    },

    /**
     * Creates a new FFI Call
     *
     * @param {Value[]=} args
     */
    createFFICall: function (args) {
        var factory = this;

        return new factory.FFICall(args || []);
    },

    /**
     * Injects the ControlFactory service dependency
     *
     * @param {ControlFactory} controlFactory
     */
    setControlFactory: function (controlFactory) {
        this.controlFactory = controlFactory;
    }
});

module.exports = CallFactory;
