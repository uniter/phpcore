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

describe('PHP negation operator "-" integration', function () {
    it('should support negating references and values', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$firstVar = "-21"; // Use a string to check for coercion.
$secondVar = 58;
$myArray = ['myElement' => -101];

return [
    '- of negative variable value' => -$firstVar,
    '- of positive variable value' => -$secondVar,
    '- of negative array element value' => -$myArray['myElement']
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            '- of negative variable value': 21,
            '- of positive variable value': -58,
            '- of negative array element value': 101
        });
    });

    it('should raise a TypeError when given an invalid operand', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

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

$result['-array'] = tryCall(function () {
    return -['my' => 'array'];
});
$result['-object'] = tryCall(function () {
    return -(new \stdClass());
});
$result['-resource'] = tryCall(function () {
    return -create_my_resource('my_resource_type');
});

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('create_my_resource', function (type) {
            return this.valueFactory.createResource(type, {});
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            // Note that the operation is treated as "... * -1", hence the error messages used.
            '-array': {
                'result': null,
                'throwable': 'TypeError :: Unsupported operand types: array * int'
            },
            '-object': {
                'result': null,
                'throwable': 'TypeError :: Unsupported operand types: stdClass * int'
            },
            '-resource': {
                'result': null,
                'throwable': 'TypeError :: Unsupported operand types: resource * int'
            }
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
