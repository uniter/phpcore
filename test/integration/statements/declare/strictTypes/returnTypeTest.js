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

describe('PHP "declare" statement return type strict_types integration', function () {
    it('should be able to return from a function with correct type in strict types mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
declare(strict_types=1);

function getNumber($myValue) : int {
    return $myValue;
}

$result = [];

$result['int'] = getNumber(21);

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int': 21
        });
    });

    it('should be able to return from a function with coercible type from weak type-checking mode when caller is in strict-types mode', async function () {
        var functionDefinitionPhp = nowdoc(function () {/*<<<EOS
<?php
function getNumber($myNumber) : int {
    return $myNumber;
}
EOS
*/;}), //jshint ignore:line
            functionDefinitionModule = tools.asyncTranspile('/path/to/my_func.php', functionDefinitionPhp),
            mainPhp = nowdoc(function () {/*<<<EOS
<?php
declare(strict_types=1);

ini_set('error_reporting', E_ALL);

$result = [];

$result['fully numeric string'] = getNumber('21');
$result['numeric string with leading whitespace'] = getNumber('    101');
$result['numeric string with trailing whitespace'] = getNumber('30   ');

return $result;
EOS
*/;}), //jshint ignore:line
            mainModule = tools.asyncTranspile('/path/to/main.php', mainPhp),
            environment = tools.createAsyncEnvironment(),
            functionDefinitionEngine = functionDefinitionModule({}, environment),
            mainEngine = mainModule({}, environment);
        await functionDefinitionEngine.execute();

        expect((await mainEngine.execute()).getNative()).to.deep.equal({
            'fully numeric string': 21,
            'numeric string with leading whitespace': 101,
            'numeric string with trailing whitespace': 30
        });
    });

    it('should throw a TypeError when returning incorrect but coercible type in strict types mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
declare(strict_types=1);

ini_set('error_reporting', E_ALL);

function getNumber($myNumber) : int {
    return $myNumber;
}

function tryCall(callable $callback) {
    $result = null;
    $throwable = null;

    try {
        $result = $callback();
    } catch (\Throwable $caughtThrowable) {
        $throwable = $caughtThrowable::class .
        ' :: ' .
        $caughtThrowable->getMessage() .
        ' @ ' .
        $caughtThrowable->getFile() . ':' . $caughtThrowable->getLine();
    }

    return [
        'result' => $result,
        'throwable' => $throwable
    ];
}

$result = [];

$result['fully numeric string'] = tryCall(function () {
    return getNumber('21');
});
$result['leading numeric string'] = tryCall(function () {
    return getNumber('21abc');
});
$result['empty string'] = tryCall(function () {
    return getNumber('');
});

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'fully numeric string': {
                'result': null,
                'throwable': 'TypeError :: getNumber(): Return value must be of type int, string returned @ /path/to/my_module.php:7'
            },
            'leading numeric string': {
                'result': null,
                'throwable': 'TypeError :: getNumber(): Return value must be of type int, string returned @ /path/to/my_module.php:7'
            },
            'empty string': {
                'result': null,
                'throwable': 'TypeError :: getNumber(): Return value must be of type int, string returned @ /path/to/my_module.php:7'
            }
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
