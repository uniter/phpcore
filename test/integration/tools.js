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
    builtins = require('../../src/builtin/builtins'),
    pausable = require('pausable'),
    phpCommon = require('phpcommon'),
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    Engine = require('../../src/Engine'),
    Environment = require('../../src/Environment'),
    AsyncPHPState = require('../../src/PHPState').async(pausable),
    SyncPHPState = require('../../src/PHPState').sync(),
    Runtime = require('../../src/Runtime').async(pausable),
    createAsyncRuntime = function () {
        // Create an isolated runtime we can install builtins into without affecting the main singleton one
        var runtime = new Runtime(
            Environment,
            Engine,
            AsyncPHPState,
            phpCommon,
            pausable,
            'async'
        );

        // Install the standard set of builtins
        runtime.install(builtins);

        return runtime;
    },
    createSyncRuntime = function () {
        // Create an isolated runtime we can install builtins into without affecting the main singleton one
        var runtime = new Runtime(
            Environment,
            Engine,
            SyncPHPState,
            phpCommon,
            null, // Don't make Pausable available - running synchronously
            'sync'
        );

        // Install the standard set of builtins
        runtime.install(builtins);

        return runtime;
    },
    transpile = function (path, php, phpCore, options) {
        var js,
            module,
            phpParser;

        options = options || {};

        phpParser = phpToAST.create(null, _.extend({
            // Capture offsets of all nodes for line tracking
            captureAllBounds: true
        }, options.phpToAST));

        if (path) {
            phpParser.getState().setPath(path);
        }

        js = phpToJS.transpile(phpParser.parse(php), _.extend({
            // Record line numbers for statements/expressions
            lineNumbers: true,

            path: path || null
        }, options.phpToJS), options.transpiler);

        module = new Function(
            'require',
            'return ' + js
        )(function () {
            return phpCore;
        });

        if (path !== null) {
            module = module.using({
                path: path
            });
        }

        return module;
    },
    asyncRuntime = require('../../async'),
    psyncRuntime = require('../../psync'),
    syncRuntime = require('../../sync');

module.exports = {
    createAsyncRuntime: createAsyncRuntime,

    createSyncRuntime: createSyncRuntime,

    createSyncEnvironment: function (options) {
        return syncRuntime.createEnvironment(options);
    },

    asyncTranspile: function (path, php, options) {
        return transpile(path, php, asyncRuntime, options);
    },

    psyncTranspile: function (path, php, options) {
        return transpile(path, php, psyncRuntime, options);
    },

    syncTranspile: function (path, php, options) {
        return transpile(path, php, syncRuntime, options);
    },

    transpile: function (runtime, path, php, options) {
        return transpile(path, php, runtime, options);
    }
};
