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
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception;

/**
 * Represents the cached result of the mark phase for a GC root.
 *
 * @param {Value} gcRoot
 * @param {MarkTree} initialTree
 * @constructor
 */
function MarkRoot(gcRoot, initialTree) {
    /**
     * @type {Value}
     */
    this.gcRoot = gcRoot;
    /**
     * @type {MarkTree|null}
     */
    this.tree = initialTree;
}

_.extend(MarkRoot.prototype, {
    /**
     * Adopts a new MarkTree for this root and all its linked roots.
     *
     * @param {MarkTree} newTree
     */
    adoptTree: function (newTree) {
        var root = this;

        root.getLinkedMarkRoots()
            .forEach(function (linkedMarkRoot) {
                linkedMarkRoot.setTree(newTree);
            });

        root.setTree(newTree);
    },

    /**
     * Fetches the GC root this MarkRoot is for.
     *
     * @returns {Value}
     */
    getGcRoot: function () {
        return this.gcRoot;
    },

    /**
     * Fetches the set of other MarkRoots linked to this one via its MarkTree.
     *
     * @returns {Set<MarkRoot>}
     */
    getLinkedMarkRoots: function () {
        var root = this;

        if (!root.tree) {
            throw new Exception('MarkRoot.getLinkedMarkRoots() :: Root is invalid');
        }

        return root.tree.getLinkedMarkRoots();
    },

    /**
     * Fetches the MarkTree for this root, if it is valid.
     *
     * @return {MarkTree}
     */
    getTree: function () {
        var root = this;

        if (!root.tree) {
            throw new Exception('MarkRoot.getTree() :: Root is invalid');
        }

        return root.tree;
    },

    /**
     * Invalidates this MarkRoot.
     */
    invalidate: function () {
        this.tree = null;
    },

    /**
     * Determines whether this root is valid.
     *
     * @returns {boolean}
     */
    isValid: function () {
        return this.tree !== null;
    },

    /**
     * Updates the MarkTree of this root.
     *
     * @param {MarkTree} tree
     */
    setTree: function (tree) {
        var root = this;

        if (!root.tree) {
            // We cannot reuse MarkRoots, because there could still be stale entries
            // in the ReachableValueToMarkRootMap cache that reference them.
            throw new Exception('MarkRoot.setTree() :: Root is invalid');
        }

        root.tree = tree;
    }
});

module.exports = MarkRoot;
