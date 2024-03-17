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
    MarkRoot = require('./MarkRoot'),
    MarkTree = require('./MarkTree');

/**
 * @constructor
 */
function GarbageFactory() {

}

_.extend(GarbageFactory.prototype, {
    /**
     * Creates a new MarkRoot with an initial MarkTree.
     *
     * @param {Value} gcRoot
     * @param {MarkTree} initialMarkTree
     * @returns {MarkRoot}
     */
    createMarkRoot: function (gcRoot, initialMarkTree) {
        return new MarkRoot(gcRoot, initialMarkTree);
    },

    /**
     * Creates a new MarkTree.
     *
     * @returns {MarkTree}
     */
    createMarkTree: function () {
        return new MarkTree();
    }
});

module.exports = GarbageFactory;
