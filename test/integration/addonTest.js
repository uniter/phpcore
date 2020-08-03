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

describe('Custom addon integration', function () {
    var runtime;

    beforeEach(function () {
        runtime = tools.createSyncRuntime();
    });

    it('should support installing an addon with a binding', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return get_my_value();
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(runtime, null, php),
            engine;

        runtime.install({
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

    it('should support installing an addon with custom syntax', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

log_it 121 * 2; // A custom log statement
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(runtime, null, php, {
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

    describe('when installing an addon into an environment (rather than into the entire runtime)', function () {
        var environment,
            module;

        beforeEach(function () {
            var php = nowdoc(function () {/*<<<EOS
<?php
return double_it(21);
EOS
*/;}); //jshint ignore:line
            environment = runtime.createEnvironment({}, [
                {
                    functionGroups: function (internals) {
                        return {
                            'double_it': function (myArgReference) {
                                return internals.valueFactory.createInteger(myArgReference.getNative() * 2);
                            }
                        };
                    }
                }
            ]);

            runtime.install({
                functionGroups: [
                    function (internals) {
                        return {
                            'function_exists': function (functionNameReference) {
                                return internals.valueFactory.createBoolean(
                                    internals.globalNamespace.hasFunction(
                                        functionNameReference.getValue().getNative()
                                    )
                                );
                            }
                        };
                    }
                ]
            });

            module = tools.transpile(runtime, null, php);
        });

        it('should correctly install the addon', function () {
            var engine = module({}, environment);

            expect(engine.execute().getNative()).to.equal(42);
        });

        it('should keep the addon isolated to the environment', function () {
            var module2;
            module({}, environment).execute();
            module2 = tools.transpile(runtime, null, '<?php return function_exists("double_it");');

            expect(module2().execute().getNative()).to.be.false;
        });
    });
});
