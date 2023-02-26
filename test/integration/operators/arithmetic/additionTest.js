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

describe('PHP addition operator "+" integration', function () {
    it('should support adding different types of value', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return [
    'int + int' => 20 + 3,
    'float + int' => 10.4 + 2,
    'int + float' => 2 + 10.4,
    'int + string' => 2 + "4.1",
    'string + int' => "4.1" + 2,
    'int + bool (true coerced to 1)' => 15 + true,
    'bool + int (true coerced to 1)' => true + 15,
    'int + null (null coerces to 0)' => 20 + null,
    'null + int (null coerces to 0)' => null + 20
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int + int': 23,
            'float + int': 12.4,
            'int + float': 12.4,
            'int + string': 6.1,
            'string + int': 6.1,
            'int + bool (true coerced to 1)': 16,
            'bool + int (true coerced to 1)': 16,
            'int + null (null coerces to 0)': 20,
            'null + int (null coerces to 0)': 20
        });
    });

    it('should correctly handle passing a variable as operand that is then re-assigned within a later operand', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['assignment within operand'] = ${($myVar = 21) && false ?: 'myVar'} + ${($myVar = 32) && false ?: 'myVar'};

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php);

        expect((await module().execute()).getNative()).to.deep.equal({
            // Value should be resolved within the operand.
            'assignment within operand': 53
        });
    });

    it('should raise a TypeError when given invalid operands', async function () {
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

$result['array + bool'] = tryCall(function () {
    return ['my' => 'array'] + true;
});
$result['array + int'] = tryCall(function () {
    return ['my' => 'array'] + 21;
});
$result['object + int'] = tryCall(function () {
    return (new \stdClass()) + 21;
});
$result['resource + int'] = tryCall(function () {
    return create_my_resource('my_resource_type') + 21;
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
            'array + bool': {
                'result': null,
                'throwable': 'TypeError :: Unsupported operand types: array + bool'
            },
            'array + int': {
                'result': null,
                'throwable': 'TypeError :: Unsupported operand types: array + int'
            },
            'object + int': {
                'result': null,
                'throwable': 'TypeError :: Unsupported operand types: stdClass + int'
            },
            'resource + int': {
                'result': null,
                'throwable': 'TypeError :: Unsupported operand types: resource + int'
            }
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
