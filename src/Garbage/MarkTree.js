/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    Set = require('core-js-pure/actual/set');

/**
 * Shared between one or more GC mark roots.
 *
 * @constructor
 */
function MarkTree() {
    /**
     * @type {Set<MarkRoot>}
     */
    this.markRoots = new Set();
}

_.extend(MarkTree.prototype, {
    /**
     * Fetches the set of MarkRoots linked to this tree.
     *
     * @returns {Set<MarkRoot>}
     */
    getLinkedMarkRoots: function () {
        return this.markRoots;
    }
});

module.exports = MarkTree;
