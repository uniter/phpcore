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
    tools = require('../../tools');

describe('PHP closure/anonymous function return type integration', function () {
    it('should be able to return from a closure with correct type in weak type-checking mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$getNumber = function ($myValue) : int {
    return $myValue;
};

$result = [];

$result['int'] = $getNumber(21);

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int': 21
        });
    });

    it('should throw a TypeError when returning incorrect, uncoercible type in weak type-checking mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

ini_set('error_reporting', E_ALL);

$getNumber = function ($myValue) : int {
    return $myValue;
};

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

$result['fully numeric string'] = tryCall(function () use ($getNumber) {
    return $getNumber('21');
});
$result['leading numeric string'] = tryCall(function () use ($getNumber) {
    return $getNumber('21abc');
});
$result['empty string'] = tryCall(function () use ($getNumber) {
    return $getNumber('');
});

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'fully numeric string': {
                'result': 21,
                'throwable': null
            },
            'leading numeric string': {
                'result': null,
                'throwable': 'TypeError :: {closure}(): Return value must be of type int, string returned @ /path/to/my_module.php:6'
            },
            'empty string': {
                'result': null,
                'throwable': 'TypeError :: {closure}(): Return value must be of type int, string returned @ /path/to/my_module.php:6'
            }
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
