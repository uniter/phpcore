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

describe('PHP division operator "/" integration', function () {
    it('should support dividing different types of value', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return [
    'int / int' => 20 / 5,
    'float / int' => 10.4 / 2,
    'int / float' => 3 / 1.5,
    'int / string' => 4.2 / "2.1",
    'string / int' => "4.4" / 2,
    'int / bool (true coerced to 1)' => 15 / true,
    'bool / int (true coerced to 1)' => true / 4,
    'null / int (null coerces to 0)' => null / 20
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int / int': 4,
            'float / int': 5.2,
            'int / float': 2,
            'int / string': 2,
            'string / int': 2.2,
            'int / bool (true coerced to 1)': 15,
            'bool / int (true coerced to 1)': 0.25,
            'null / int (null coerces to 0)': 0 // Note that this isn't division *by* zero.
        });
    });

    it('should raise a warning and return false on divide by zero', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return 100 / 0;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('my_module.php', php),
            engine = module(),
            resultValue = await engine.execute();

        expect(resultValue.getType()).to.equal('boolean');
        expect(resultValue.getNative()).to.equal(false);
        // TODO: In PHP 7 this should actually be:
        //       "PHP Fatal error:  Uncaught DivisionByZeroError: Modulo by zero in my_module.php:3".
        expect(engine.getStderr().readAll()).to.equal('PHP Warning:  Division by zero in my_module.php on line 3\n');
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

$result['array / bool'] = tryCall(function () {
    return ['my' => 'array'] / true;
});
$result['array / int'] = tryCall(function () {
    return ['my' => 'array'] / 21;
});
$result['object / int'] = tryCall(function () {
    return (new \stdClass()) / 21;
});
$result['resource / int'] = tryCall(function () {
    return create_my_resource('my_resource_type') / 21;
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
            'array / bool': {
                'result': null,
                'throwable': 'TypeError :: Unsupported operand types: array / bool'
            },
            'array / int': {
                'result': null,
                'throwable': 'TypeError :: Unsupported operand types: array / int'
            },
            'object / int': {
                'result': null,
                'throwable': 'TypeError :: Unsupported operand types: stdClass / int'
            },
            'resource / int': {
                'result': null,
                'throwable': 'TypeError :: Unsupported operand types: resource / int'
            }
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
