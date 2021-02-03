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
    escapeRegex = require('regexp.escape'),
    path = require('path'),
    mochaPath = path.dirname(require.resolve('mocha/package.json')),
    pausable = require('pausable'),
    phpCorePath = path.resolve(__dirname, '../..'),
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    SourceMapConsumer = require('source-map').SourceMapConsumer,
    WeakMap = require('es6-weak-map'),
    runtimeFactory = require('../../src/shared/runtimeFactory'),

    // A map that allows looking up the source map data for a module later on
    moduleDataMap = new WeakMap(),

    createAsyncRuntime = function () {
        // Create an isolated runtime we can install builtins into without affecting the main singleton one
        var runtime = runtimeFactory.create('async', pausable);

        // Install the standard set of builtins
        runtime.install(builtins);

        return runtime;
    },
    createSyncRuntime = function () {
        // Create an isolated runtime we can install builtins into without affecting the main singleton one
        var runtime = runtimeFactory.create('sync');

        // Install the standard set of builtins
        runtime.install(builtins);

        return runtime;
    },

    transpile = function (path, php, phpCore, options) {
        var transpiledResult,
            module,
            phpParser,
            phpToJSBaseOptions;

        options = options || {};
        path = path || null;

        phpParser = phpToAST.create(null, _.extend({
            // Capture offsets of all nodes for line tracking
            captureAllBounds: true
        }, options.phpToAST));

        if (path) {
            phpParser.getState().setPath(path);
        }

        phpToJSBaseOptions = {
            // Record line numbers for statements/expressions
            lineNumbers: true,

            path: path,

            prefix: 'return '
        };

        if (options.sourceMap) {
            // Generate a source map if specified in test options
            _.extend(phpToJSBaseOptions, {
                sourceMap: {
                    sourceContent: php,
                    returnMap: true
                }
            });
        }

        transpiledResult = phpToJS.transpile(
            phpParser.parse(php),
            _.extend(phpToJSBaseOptions, options.phpToJS),
            options.transpiler
        );

        module = new Function('require', options.sourceMap ? transpiledResult.code : transpiledResult)(function () {
            return phpCore;
        });

        if (path !== null) {
            module = module.using({
                path: path
            });
        }

        if (options.sourceMap) {
            // Allow source map data to be looked up later (see .normaliseStack(...))
            moduleDataMap.set(module, {sourceMapGenerator: transpiledResult.map, path: path});
        }

        return module;
    },
    asyncRuntime = require('../../async'),
    psyncRuntime = require('../../psync'),
    syncRuntime = require('../../sync'),

    // Errors from a Function constructor-created function may be offset by the function signature
    // (currently 2), so we need to calculate this in order to adjust for source mapping below
    errorStackLineOffset = new Function('return new Error().stack;')().match(/<anonymous>:(\d+):\d+/)[1] - 1;

module.exports = {
    createAsyncEnvironment: function (options, addons) {
        return asyncRuntime.createEnvironment(options, addons);
    },

    createAsyncRuntime: createAsyncRuntime,

    createPsyncEnvironment: function (options, addons) {
        return psyncRuntime.createEnvironment(options, addons);
    },

    createSyncRuntime: createSyncRuntime,

    createSyncEnvironment: function (options, addons) {
        return syncRuntime.createEnvironment(options, addons);
    },

    /**
     * Attempts to make this integration test slightly less brittle when future changes occur,
     * by scrubbing out things that are out of our control and likely to change (such as line/column numbers
     * of stack frames within Mocha) and performs source mapping of the stack frame file/line/column
     *
     * @param {string} stack
     * @param {Function} module
     * @return {Promise<string>}
     */
    normaliseStack: function (stack, module) {
        var moduleData;

        if (!moduleDataMap.has(module)) {
            throw new Error(
                'Test harness error: module data map does not contain data for this module - ' +
                'did you forget to set options.sourceMap?'
            );
        }

        moduleData = moduleDataMap.get(module);

        return new SourceMapConsumer(moduleData.sourceMapGenerator/*, sourceMapUrl */)
            .then(function (sourceMapConsumer) {
                stack = stack.replace(
                    // Find stack frames for the transpiled PHP code - source maps would not be handled natively
                    // even if we embedded them in the generated JS, so we need to perform manual mapping
                    /\(eval at transpile \(.*\/test\/integration\/tools.js:\d+:\d+\), <anonymous>:(\d+):(\d+)\)/g,
                    function (all, line, column) {
                        var mappedPosition = sourceMapConsumer.originalPositionFor({
                            // Note: These number casts are required, the source-map library
                            //       will otherwise fail to resolve any mappings
                            line: line - errorStackLineOffset,
                            column: column * 1
                        });

                        if (mappedPosition.line === null && mappedPosition.column === null) {
                            // Unless something has gone wrong, we should be able to map all generated JS frames back to PHP
                            throw new Error('Stack line in evaluated PHP code could not be mapped back to PHP source');
                        }

                        return '(' + mappedPosition.source + ':' + mappedPosition.line + ':' + mappedPosition.column + ')';
                    }
                );

                // Normalise Mocha frames
                stack = stack.replace(new RegExp('^(.*)' + escapeRegex(mochaPath) + '(.*:)\\d+:\\d+', 'gm'), '$1/path/to/mocha$2??:??');
                // Normalise Node.js internal frames
                stack = stack.replace(new RegExp(/^(.*?)(?:node:)?internal(\/.*?)(?:\.js)?:\d+:\d+/gm), '$1/path/to/internal$2:??:??');
                // Normalise PHPCore frames
                stack = stack.replace(new RegExp(escapeRegex(phpCorePath), 'g'), '/path/to/phpcore');

                return stack;
            });
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
