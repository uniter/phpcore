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
    tools = require('../../../../../tools');

describe('PHP builtin FFI function non-coercion union type integration', function () {
    it('should support installing a custom function with union parameter type', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

class MyClass {
    public function __toString() {
        return '[MyClass instance as string!]';
    }
}

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

function my_function() {}

$result['with allowed bool'] = tryCall(function () {
    return with_bool_or_int(true);
});
$result['with allowed int'] = tryCall(function () {
    return with_bool_or_int(123);
});
$result['with coerced float -> int'] = tryCall(function () {
    return with_bool_or_int(321.456);
});
$result['with coerced int -> float'] = tryCall(function () {
    return with_callable_or_float(789);
});
$result['with coerced numeric string -> float'] = tryCall(function () {
    return with_float_or_int_or_bool('123.456');
});
$result['with coerced numeric string -> int'] = tryCall(function () {
    return with_float_or_int_or_bool('654');
});
$result['with coerced non-numeric truthy string -> bool'] = tryCall(function () {
    return with_float_or_int_or_bool('abacus');
});
$result['with coerced non-numeric falsy string -> bool'] = tryCall(function () {
    return with_float_or_int_or_bool('');
});
$result['with scalar that could be coerced but matches another type'] = tryCall(function () {
    return with_callable_or_bool('my_function');
});
$result['with coerced allowed object -> string'] = tryCall(function () {
    return with_int_or_string_nullable(new MyClass);
});
$result['with explicitly-allowed null'] = tryCall(function () {
    return with_int_or_string_nullable(null);
});
$result['with disallowed object'] = tryCall(function () {
    return with_bool_or_int(new \stdClass);
});
$result['with disallowed null'] = tryCall(function () {
    return with_bool_or_int(null);
});

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction(
            'with_bool_or_int',
            function (myParamValue) {
                return myParamValue.getType() + ': ' + myParamValue.getNative();
            },
            'bool|int $myParam'
        );
        engine.defineNonCoercingFunction(
            'with_callable_or_bool',
            function (myParamValue) {
                return myParamValue.getType() + ': ' + myParamValue.getNative();
            },
            'callable|bool $myParam'
        );
        engine.defineNonCoercingFunction(
            'with_callable_or_float',
            function (myParamValue) {
                return myParamValue.getType() + ': ' + myParamValue.getNative();
            },
            'callable|float $myParam'
        );
        engine.defineNonCoercingFunction(
            'with_float_or_int_or_bool',
            function (myParamValue) {
                return myParamValue.getType() + ': ' + myParamValue.getNative();
            },
            'float|int|bool $myParam'
        );
        engine.defineNonCoercingFunction(
            'with_int_or_string_nullable',
            function (myParamValue) {
                return myParamValue.getType() + ': ' + myParamValue.getNative();
            },
            'int|string|null $myParam'
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with allowed bool': {
                'result': 'boolean: true',
                'throwable': null
            },
            'with allowed int': {
                'result': 'int: 123',
                'throwable': null
            },
            'with coerced float -> int': {
                'result': 'int: 321',
                'throwable': null
            },
            'with coerced int -> float': {
                'result': 'float: 789',
                'throwable': null
            },
            'with coerced numeric string -> float': {
                'result': 'float: 123.456',
                'throwable': null
            },
            'with coerced numeric string -> int': {
                'result': 'int: 654',
                'throwable': null
            },
            'with coerced non-numeric truthy string -> bool': {
                'result': 'boolean: true',
                'throwable': null
            },
            'with coerced non-numeric falsy string -> bool': {
                'result': 'boolean: false',
                'throwable': null
            },
            'with scalar that could be coerced but matches another type': {
                'result': 'string: my_function', // Matches "callable".
                'throwable': null
            },
            'with coerced allowed object -> string': {
                'result': 'string: [MyClass instance as string!]',
                'throwable': null
            },
            'with explicitly-allowed null': {
                'result': 'null: null',
                'throwable': null
            },
            'with disallowed object': {
                'result': null,
                'throwable': 'with_bool_or_int(): Argument #1 ($myParam) must be of type int|bool, stdClass given'
            },
            'with disallowed null': {
                'result': null,
                'throwable': 'with_bool_or_int(): Argument #1 ($myParam) must be of type int|bool, null given'
            }
        });
    });
});
