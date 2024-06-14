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

describe('PHP function aliasing integration', function () {
    it('should support aliasing functions', async function () {
        var php,
            module,
            engine;

        php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Awesome\Space
{
    function myFunc(int $myArg) {
        return $myArg . ' was passed to ' . __FUNCTION__;
    }
}

namespace
{
    $result = [];

    function tryCall(callable $callback) {
        $result = null;
        $throwable = null;

        try {
            $result = $callback();
        } catch (\Throwable $caughtThrowable) {
            $throwable = $caughtThrowable->getMessage();
        }

        return [
            'result' => $result,
            'throwable' => $throwable
        ];
    }

    // Use our custom function to install the alias.
    function_alias('My\\Awesome\\Space\\myFunc', 'myAliasFunc');

    $result['with valid argument'] = tryCall(function () {
        return My\Awesome\Space\myAliasFunc(21);
    });

    $result['with invalid argument'] = tryCall(function () {
        return My\Awesome\Space\myAliasFunc('this is invalid');
    });

    return $result;
}
EOS
*/;}); //jshint ignore:line
        module = tools.asyncTranspile('/path/to/my_module.php', php);
        engine = module();

        engine.defineCoercingFunction('function_alias', function (originalName, aliasName) {
            engine.aliasFunction(originalName, aliasName);
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with valid argument': {
                result: '21 was passed to My\\Awesome\\Space\\myAliasFunc',
                throwable: null
            },
            'with invalid argument': {
                result: null,
                // Note that the alias name should be used.
                throwable: 'My\\Awesome\\Space\\myAliasFunc(): Argument #1 ($myArg) must be of type int, string given, ' +
                    'called in /path/to/my_module.php on line 38'
            }
        });
    });

    it('should support aliasing overloaded functions', async function () {
        var php,
            module,
            engine;

        php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function tryCall(callable $callback) {
    $result = null;
    $throwable = null;

    try {
        $result = $callback();
    } catch (\Throwable $caughtThrowable) {
        $throwable = $caughtThrowable->getMessage();
    }

    return [
        'result' => $result,
        'throwable' => $throwable
    ];
}

// Use our custom function to install the alias.
function_alias('myOverloadedFunc', 'myAliasFunc');

$result['one valid argument'] = tryCall(function () {
    return myAliasFunc(21);
});

$result['one invalid argument'] = tryCall(function () {
    return myAliasFunc('this is invalid');
});

return $result;
EOS
*/;}); //jshint ignore:line
        module = tools.asyncTranspile('/path/to/my_module.php', php);
        engine = module();
        engine.defineOverloadedFunction('myOverloadedFunc', function (internals) {
            internals.disableAutoCoercion();

            internals.defineVariant(': string', function () {
                return 'No arguments for me';
            });
            internals.defineVariant('int $number : string', function (numberValue) {
                return 'My number was: ' + numberValue.getNative();
            });
            internals.defineVariant('string $first, string $second : string', function (firstValue, secondValue) {
                return 'I said ' + firstValue.getNative() + ', ' + secondValue.getNative() + '!';
            });
        });
        engine.defineCoercingFunction('function_alias', function (originalName, aliasName) {
            engine.aliasFunction(originalName, aliasName);
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'one valid argument': {
                result: 'My number was: 21',
                throwable: null
            },
            'one invalid argument': {
                result: null,
                // Note that the alias name should be used.
                throwable: 'myAliasFunc(): Argument #1 ($number) must be of type int, string given'
            }
        });
    });
});
