/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var expect = require('chai').expect,
    nowdoc = require('nowdoc'),
    tools = require('./tools');

describe('Custom plugin integration', function () {
    beforeEach(function () {
        this.runtime = tools.createSyncRuntime();
    });

    it('should support installing a plugin with a binding', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return get_my_value();
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(this.runtime, null, php),
            engine;

        this.runtime.install({
            bindingGroups: [
                function () {
                    return {
                        'my_binding': function (bindingOptions) {
                            return bindingOptions.my_option;
                        }
                    };
                }
            ],
            functionGroups: [
                function (internals) {
                    return {
                        'get_my_value': function () {
                            return internals.valueFactory.coerce(internals.getBinding('my_binding'));
                        }
                    };
                }
            ]
        });

        engine = module({
            my_binding: {
                my_option: 21
            }
        });

        expect(engine.execute().getNative()).to.equal(21);
    });

    it('should support installing a plugin with custom syntax', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

log_it 121 * 2; // A custom log statement
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(this.runtime, null, php, {
                phpToAST: {
                    rules: {
                        'N_CUSTOM_LOG': {
                            components: [/log_it/, {name: 'arg', rule: 'N_EXPRESSION'}, /;/]
                        },
                        'N_NAMESPACE_SCOPED_STATEMENT': {
                            components: {oneOf: ['N_CUSTOM_LOG', 'N_NAMESPACE_SCOPED_STATEMENT']}
                        }
                    }
                },
                transpiler: {
                    nodes: {
                        'N_CUSTOM_LOG': function (node, interpret, context) {
                            return context.createStatementSourceNode(
                                ['stdout.write("Logged: " + ', interpret(node.arg, {getValue: true}), '.getNative());'],
                                node
                            );
                        }
                    }
                }
            }),
            engine = module({
                my_binding: {
                    my_option: 21
                }
            });

        engine.execute();

        expect(engine.getStdout().readAll()).to.equal('Logged: 242');
    });
});
