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

describe('PHP mixed type integration', function () {
    it('should allow passing all value types for function parameters typed as "mixed"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function myChecker(mixed $myValue) {
    return $myValue;
}

$value = true;
$result['bool'] = myChecker($value);

$value = 21;
$result['int'] = myChecker($value);

$value = 0x539;
$result['hexadecimal literal'] = myChecker($value);

$value = 02471;
$result['octal literal'] = myChecker($value);

$value = 0b10100111001;
$result['binary literal'] = myChecker($value);

$value = 1337e0;
$result['integer literal with exponent'] = myChecker($value);

$value = '0x539';
$result['hexadecimal literal as string'] = myChecker($value);

$value = '02471';
$result['octal literal as string'] = myChecker($value);

$value = '0b10100111001';
$result['binary literal as string'] = myChecker($value);

$value = '1337e0';
$result['integer literal with exponent as string'] = myChecker($value);

$value = 101.222;
$result['float'] = myChecker($value);

$value = 'hello world';
$result['non-numeric string'] = myChecker($value);

$value = 'hello world 987';
$result['non-numeric string ending in number'] = myChecker($value);

$value = '456';
$result['numeric string'] = myChecker($value);

$value = [27, 31];
$result['array of numbers'] = myChecker($value);

$value = new stdClass;
$value->myProp = 21;
$result['stdClass instance'] = myChecker($value);

$value = create_my_resource('my_resource_type');
$result['valid resource'] = myChecker($value);

$value = null;
$result['null'] = myChecker($value);

// Skipping "unknown type" as we have no support yet (usually returned for closed file descriptors etc.)

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('create_my_resource', function (type) {
            return this.valueFactory.createResource(type, {});
        });
        engine.defineNonCoercingFunction('is_it_numeric', function (value) {
            return value.isNumeric();
        }, 'mixed $value');

        expect((await engine.execute()).getNative()).to.deep.equal({
            'bool': true,
            'int': 21,
            'hexadecimal literal': 0x539,
            'octal literal': parseInt('02471', 8),
            'binary literal': parseInt('10100111001', 2),
            'integer literal with exponent': 1337e0,
            'hexadecimal literal as string': '0x539',
            'octal literal as string': '02471',
            'binary literal as string': '0b10100111001',
            'integer literal with exponent as string': '1337e0',
            'float': 101.222,
            'non-numeric string': 'hello world',
            'non-numeric string ending in number': 'hello world 987',
            'numeric string': '456',
            'array of numbers': [27, 31],
            'stdClass instance': {'myProp': 21},
            // Resources are coerced to their globally unique ID.
            'valid resource': 1,
            'null': null
        });
    });
});
