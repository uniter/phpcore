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

describe('PHP string comparison operators integration', function () {
    it('should support all PHP comparison operators', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['string == string'] = 'hello' == 'world';
$result['string == same string'] = 'hello' == 'hello';
$result['int string == int'] = '21' == 4;
$result['int string == same int'] = '21' == 21;
$result['int string == non-numeric string'] = '21' == 'not a number';
$result['non-numeric string == int'] = 'not a number' == 123;
$result['non-numeric string == float'] = 'not a number' == 123.45;
$result['empty string == string'] = '' == 'not empty';

$result['string === string'] = 'hello' === 'world';
$result['string === same string'] = 'hello' === 'hello';
$result['int string === int'] = '21' === 101;
$result['int string === same int'] = '21' === 21;

$result['string != string'] = 'hello' != 'world';
$result['string != same string'] = 'hello' != 'hello';
$result['int string != int'] = '21' != 101;
$result['int string != same int'] = '21' != 21;
$result['int string != int string'] = '21' != '101';
$result['int string != same int string'] = '21' != '21';
$result['empty string != string'] = '' != 'not empty';

$result['string int <> int'] = '21' <> 4;
$result['string int <> string int'] = '21' <> '21';

$result['string int !== smaller int'] = '21' !== 4;
$result['string int !== string int'] = '21' !== '21';
$result['string int !== same int'] = '25' !== 25;

$result['string int < smaller int'] = '21' < 4;
$result['string int < larger int'] = '5' < 10;

$result['string int > smaller int'] = '21' > 4;
$result['string int > larger int'] = '5' > 10;

$result['string int <= smaller int'] = '21' <= 4;
$result['string int <= larger int'] = '5' <= 10;
$result['string int <= same int'] = '15' <= 15;

$result['string int >= smaller int'] = '21' >= 4;
$result['string int >= larger int'] = '5' >= 10;
$result['string int >= same int'] = '15' >= 15;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'string == string': false,
            'string == same string': true,
            'int string == int': false,
            'int string == same int': true,
            'int string == non-numeric string': false,
            'non-numeric string == int': false,
            'non-numeric string == float': false,
            'empty string == string': false,

            'string === string': false,
            'string === same string': true,
            'int string === int': false,
            'int string === same int': false,

            'string != string': true,
            'string != same string': false,
            'int string != int': true,
            'int string != same int': false,
            'int string != int string': true,
            'int string != same int string': false,
            'empty string != string': true,

            'string int <> int': true,
            'string int <> string int': false,

            'string int !== smaller int': true,
            'string int !== string int': false,
            'string int !== same int': true,

            'string int < smaller int': false,
            'string int < larger int': true,

            'string int > smaller int': true,
            'string int > larger int': false,

            'string int <= smaller int': false,
            'string int <= larger int': true,
            'string int <= same int': true,

            'string int >= smaller int': true,
            'string int >= larger int': false,
            'string int >= same int': true
        });
    });
});
