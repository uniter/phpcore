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
    tools = require('../tools');

describe('Custom addon with custom opcodes integration', function () {
    it('should support installing an addon with custom syntax that uses a new custom opcode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

log_it 121 * 2; // A custom log statement
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php, {
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
                                [
                                    context.useCoreSymbol('customLogOpcode'),
                                    '(',
                                    interpret(node.arg),
                                    ');'
                                ],
                                node
                            );
                        }
                    }
                }
            }),
            environment = tools.createAsyncEnvironment({}, [
                {
                    // Define opcodes
                    opcodeGroups: function (internals) {
                        internals.setOpcodeFetcher('calculation');

                        return {
                            'customLogOpcode': internals.typeHandler('val myArg', function (myArgValue) {
                                return internals.output.write('Logged: ' + myArgValue.getNative());
                            })
                        };
                    }
                }
            ]),
            engine = module({}, environment);

        await engine.execute();

        expect(engine.getStdout().readAll()).to.equal('Logged: 242');
    });

    it('should support installing an addon that hooks an opcode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function my_unhooked_func($arg)
{
    return $arg . ' from my_unhooked_func()';
}

function my_hooked_func($arg)
{
    return $arg . ' from my_hooked_func()';
}

// Nothing special should happen here
$result[] = my_unhooked_func('first');

// Here be dragons!
$result[] = my_hooked_func('second');

// Nothing special should happen here either
$result[] = my_unhooked_func('third');

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({}, [
                {
                    opcodeGroups: function (internals) {
                        var valueFactory = internals.valueFactory;

                        internals.setOpcodeFetcher('calculation');

                        // By default we wouldn't be able to override an opcode's handler
                        // (to prevent accidentally breaking things) so we need to be explicit.
                        internals.allowOpcodeOverride();

                        return {
                            // Override the standard built-in callFunction() opcode's handler. This opcode
                            // is used every time a function is called, like the three times in our test.
                            callFunction: internals.typeHandler(
                                'string name, snapshot ...argReferences : ref|val',
                                function (name, argReferences) {
                                    // Note that for async mode, the result may be a Future or FutureValue.
                                    return internals.callPreviousHandler('callFunction', [name, argReferences])
                                        .next(function (previousResult) {
                                            if (name === 'my_hooked_func') {
                                                // When calling our target hooked function in PHP-land, do something special
                                                return previousResult.concat(valueFactory.createString(' [from callFunction hook!]'));
                                            }

                                            // For all other functions, just return the unhooked result
                                            return previousResult;
                                        });
                                }
                            )
                        };
                    }
                }
            ]),
            engine = module({}, environment);

        expect((await engine.execute()).getNative()).to.deep.equal([
            // Nothing special should happen here
            'first from my_unhooked_func()',

            // This call should have been hooked!
            'second from my_hooked_func() [from callFunction hook!]',

            // Nothing special should happen here either
            'third from my_unhooked_func()'
        ]);
    });
});
