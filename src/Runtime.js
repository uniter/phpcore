/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash'),
    require('./PHPState'),
    require('./Stream')
], function (
    _,
    PHPState,
    Stream
) {
    function Runtime(Environment, Engine, phpCommon, pausable, phpToAST, phpToJS) {
        this.builtins = {
            classes: {},
            constantGroups: [],
            functionGroups: []
        };
        this.Engine = Engine;
        this.Environment = Environment;
        this.pausable = pausable;
        this.phpCommon = phpCommon;
        this.phpToAST = phpToAST;
        this.phpToJS = phpToJS;
    }

    _.extend(Runtime.prototype, {
        compile: function (wrapper) {
            var runtime = this,
                pausable = runtime.pausable,
                phpCommon = runtime.phpCommon,
                phpToAST = runtime.phpToAST,
                phpToJS = runtime.phpToJS;

            return function (options, environment) {
                if (environment) {
                    options = _.extend({}, environment.getOptions(), options);
                } else {
                    environment = runtime.createEnvironment(options);
                }

                return new runtime.Engine(
                    runtime,
                    environment,
                    phpCommon,
                    options,
                    wrapper,
                    pausable,
                    phpToAST,
                    phpToJS
                );
            };
        },

        createEnvironment: function (options) {
            var runtime = this,
                stdin = new Stream(),
                stdout = new Stream(),
                stderr = new Stream(),
                parser = runtime.phpToAST.create(stderr),
                state = new PHPState(runtime.builtins, stdin, stdout, stderr, runtime.pausable);

            return new runtime.Environment(state, parser, options);
        },

        install: function (newBuiltins) {
            var builtins = this.builtins;

            [].push.apply(builtins.functionGroups, newBuiltins.functionGroups);
            _.extend(builtins.classes, newBuiltins.classes);
            [].push.apply(builtins.constantGroups, newBuiltins.constantGroups);
        }
    });

    return Runtime;
}, {strict: true});
