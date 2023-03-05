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

describe('PHP string loose equality comparison operator "==" integration', function () {
    it('should be able to loosely compare values', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['string == same string'] = 'hello' == 'hello';
$result['string == different string'] = 'hello' == 'world';

$result['int string == same int'] = '21' == 21;
$result['int string == different int'] = '21' == 4;
$result['int string == non-numeric string'] = '21' == 'not a number';

$result['float string == same float'] = '21.123' == 21.123;
$result['float string == different float'] = '21.123' == 4.123;
$result['float string == non-numeric string'] = '21.123' == 'not a number';

$result['int string == same float'] = '21' == 21.0;
$result['int string == different float'] = '21' == 4.123;

$result['float string == same int'] = '21.0' == 21;
$result['float string == different int'] = '21.123' == 4;

$result['float string with matching prefix == different int'] = '21.123' == 21;
$result['float string with matching prefix == different float'] = '21.123' == 21.0;

$result['non-numeric string == int'] = 'not a number' == 123;
$result['non-numeric string == float'] = 'not a number' == 123.45;

$result['empty string == string'] = '' == 'not empty';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'string == same string': true,
            'string == different string': false,

            'int string == same int': true,
            'int string == different int': false,
            'int string == non-numeric string': false,

            'float string == same float': true,
            'float string == different float': false,
            'float string == non-numeric string': false,

            'int string == same float': true,
            'int string == different float': false,

            'float string == same int': true,
            'float string == different int': false,

            'float string with matching prefix == different int': false,
            'float string with matching prefix == different float': false,

            'non-numeric string == int': false,
            'non-numeric string == float': false,

            'empty string == string': false
        });
    });
});
