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
 * @param {Scope} scope
 * @param {NamespaceScope} namespaceScope
 * @param {Value[]} args
 * @param {Class|null} newStaticClass
 * @constructor
 */
function Call(scope, namespaceScope, args, newStaticClass) {
    /**
     * @type {Value[]}
     */
    this.args = args;
    /**
     * @type {function|null}
     */
    this.finder = null;
    /**
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
    /**
     * @type {Class|null}
     */
    this.newStaticClass = newStaticClass;
    /**
     * @type {Scope}
     */
    this.scope = scope;
}

_.extend(Call.prototype, {
    /**
     * Fetches the path to the file this call was made from
     *
     * @returns {string|null}
     */
    getFilePath: function () {
        return this.namespaceScope.getFilePath();
    },

    /**
     * Fetches the Value objects passed as arguments to the called function
     *
     * @returns {Value[]}
     */
    getFunctionArgs: function () {
        return this.args;
    },

    /**
     * Fetches the name of the current function
     *
     * @returns {string}
     */
    getFunctionName: function () {
        return this.scope.getFunctionName().getNative();
    },

    /**
     * Fetches the number of the last line executed inside this call's scope
     *
     * @returns {number|null}
     */
    getLastLine: function () {
        var call = this;

        if (!call.finder) {
            return null;
        }

        return call.finder();
    },

    /**
     * Fetches the scope inside the called function
     *
     * @returns {Scope}
     */
    getScope: function () {
        return this.scope;
    },

    /**
     * Fetches the static class introduced by this call's scope. If null,
     * the call was a forwarding call, and so the parent call's static class should be used
     *
     * @returns {Class|null}
     */
    getStaticClass: function () {
        var call = this,
            thisObject = call.scope.getThisObject();

        if (thisObject && thisObject.getType() !== 'null') {
            return thisObject.getClass();
        }

        return call.newStaticClass;
    },

    /**
     * Registers a finder for looking up the current/last line number inside the called function
     *
     * @param {function} finder
     */
    instrument: function (finder) {
        this.finder = finder;
    }
});

module.exports = Call;
