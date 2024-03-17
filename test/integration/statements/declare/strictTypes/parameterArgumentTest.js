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
    tools = require('../../../tools');

describe('PHP "declare" statement parameter argument strict_types integration', function () {
    it('should be able to call a function with correct type in strict types mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
declare(strict_types=1);

function myDoubler(int $myNumber) {
    return $myNumber * 2;
}

$result = [];

$result['int'] = myDoubler(21);

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int': 42
        });
    });

    it('should be able to call a function with coercible type from loose-types mode when function definition is in strict-types mode', async function () {
        var functionDefinition1Php = nowdoc(function () {/*<<<EOS
<?php
declare(strict_types=1);

function myDoubler(int $myNumber) {
    return $myNumber * 2;
}
EOS
*/;}), //jshint ignore:line
            functionDefinition1Module = tools.asyncTranspile('/path/to/my_func1.php', functionDefinition1Php),
            functionDefinition2Php = nowdoc(function () {/*<<<EOS
<?php
// Implicit, but we set it explicitly for testing just to be sure.
declare(strict_types=0);

function callMyDoubler($myNumber) {
    return myDoubler($myNumber);
}
EOS
*/;}), //jshint ignore:line
            functionDefinition2Module = tools.asyncTranspile('/path/to/my_func2.php', functionDefinition2Php),
            mainPhp = nowdoc(function () {/*<<<EOS
<?php
declare(strict_types=1);

ini_set('error_reporting', E_ALL);

$result = [];

$result['fully numeric string'] = callMyDoubler('21');
$result['numeric string with leading whitespace'] = callMyDoubler('    101');
$result['numeric string with trailing whitespace'] = callMyDoubler('30   ');

return $result;
EOS
*/;}), //jshint ignore:line
            mainModule = tools.asyncTranspile('/path/to/main.php', mainPhp),
            environment = tools.createAsyncEnvironment(),
            functionDefinition1Engine = functionDefinition1Module({}, environment),
            functionDefinition2Engine = functionDefinition2Module({}, environment),
            mainEngine = mainModule({}, environment);
        await functionDefinition1Engine.execute();
        await functionDefinition2Engine.execute();

        expect((await mainEngine.execute()).getNative()).to.deep.equal({
            'fully numeric string': 42,
            'numeric string with leading whitespace': 202,
            'numeric string with trailing whitespace': 60
        });
    });

    it('should throw a TypeError when passing incorrect but coercible type in strict types mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
declare(strict_types=1);

ini_set('error_reporting', E_ALL);

function myDoubler(int $myNumber) {
    return $myNumber * 2;
}

function tryCall(callable $callback) {
    $result = null;
    $throwable = null;

    try {
        $result = $callback();
    } catch (\Throwable $caughtThrowable) {
        $throwable = $caughtThrowable::class . ' :: ' . $caughtThrowable->getMessage();
    }

    return [
        'result' => $result,
        'throwable' => $throwable
    ];
}

$result = [];

$result['fully numeric string'] = tryCall(function () {
    return myDoubler('21');
});
$result['leading numeric string'] = tryCall(function () {
    return myDoubler('21abc');
});
$result['empty string'] = tryCall(function () {
    return myDoubler('');
});

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'fully numeric string': {
                'result': null,
                'throwable': 'TypeError :: myDoubler(): Argument #1 ($myNumber) must be of type int, string given, called in /path/to/my_module.php on line 29'
            },
            'leading numeric string': {
                'result': null,
                'throwable': 'TypeError :: myDoubler(): Argument #1 ($myNumber) must be of type int, string given, called in /path/to/my_module.php on line 32'
            },
            'empty string': {
                'result': null,
                'throwable': 'TypeError :: myDoubler(): Argument #1 ($myNumber) must be of type int, string given, called in /path/to/my_module.php on line 35'
            }
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should throw a TypeError when passing incorrect but coercible type when caller is in strict types mode', async function () {
        var functionDefinitionPhp = nowdoc(function () {/*<<<EOS
<?php
function myDoubler(int $myNumber) {
    return $myNumber * 2;
}
EOS
*/;}), //jshint ignore:line
            functionDefinitionModule = tools.asyncTranspile('/path/to/my_func.php', functionDefinitionPhp),
            mainPhp = nowdoc(function () {/*<<<EOS
<?php
declare(strict_types=1);

ini_set('error_reporting', E_ALL);

function tryCall(callable $callback) {
    $result = null;
    $throwable = null;

    try {
        $result = $callback();
    } catch (\Throwable $caughtThrowable) {
        $throwable = $caughtThrowable::class . ' :: ' . $caughtThrowable->getMessage();
    }

    return [
        'result' => $result,
        'throwable' => $throwable
    ];
}

$result = [];

$result['fully numeric string'] = tryCall(function () {
    return myDoubler('21');
});
$result['leading numeric string'] = tryCall(function () {
    return myDoubler('21abc');
});
$result['empty string'] = tryCall(function () {
    return myDoubler('');
});

return $result;
EOS
*/;}), //jshint ignore:line
            mainModule = tools.asyncTranspile('/path/to/main.php', mainPhp),
            environment = tools.createAsyncEnvironment(),
            functionDefinitionEngine = functionDefinitionModule({}, environment),
            mainEngine = mainModule({}, environment);
        await functionDefinitionEngine.execute();

        expect((await mainEngine.execute()).getNative()).to.deep.equal({
            'fully numeric string': {
                'result': null,
                'throwable': 'TypeError :: myDoubler(): Argument #1 ($myNumber) must be of type int, string given, called in /path/to/main.php on line 25'
            },
            'leading numeric string': {
                'result': null,
                'throwable': 'TypeError :: myDoubler(): Argument #1 ($myNumber) must be of type int, string given, called in /path/to/main.php on line 28'
            },
            'empty string': {
                'result': null,
                'throwable': 'TypeError :: myDoubler(): Argument #1 ($myNumber) must be of type int, string given, called in /path/to/main.php on line 31'
            }
        });
        expect(functionDefinitionEngine.getStderr().readAll()).to.equal('');
        expect(mainEngine.getStderr().readAll()).to.equal('');
    });
});
