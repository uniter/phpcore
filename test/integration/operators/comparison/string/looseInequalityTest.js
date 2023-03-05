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

describe('PHP string loose inequality comparison operators integration', function () {
    it('should be able to loosely compare values using "!="', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['string != same string'] = 'hello' != 'hello';
$result['string != different string'] = 'hello' != 'world';

$result['int string != same int'] = '21' != 21;
$result['int string != different int'] = '21' != 4;
$result['int string != non-numeric string'] = '21' != 'not a number';

$result['float string != same float'] = '21.123' != 21.123;
$result['float string != different float'] = '21.123' != 4.123;
$result['float string != non-numeric string'] = '21.123' != 'not a number';

$result['int string != same float'] = '21' != 21.0;
$result['int string != different float'] = '21' != 4.123;

$result['float string != same int'] = '21.0' != 21;
$result['float string != different int'] = '21.123' != 4;

$result['float string with matching prefix != different int'] = '21.123' != 21;
$result['float string with matching prefix != different float'] = '21.123' != 21.0;

$result['non-numeric string != int'] = 'not a number' != 123;
$result['non-numeric string != float'] = 'not a number' != 123.45;

$result['empty string != string'] = '' != 'not empty';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'string != same string': false,
            'string != different string': true,

            'int string != same int': false,
            'int string != different int': true,
            'int string != non-numeric string': true,

            'float string != same float': false,
            'float string != different float': true,
            'float string != non-numeric string': true,

            'int string != same float': false,
            'int string != different float': true,

            'float string != same int': false,
            'float string != different int': true,

            'float string with matching prefix != different int': true,
            'float string with matching prefix != different float': true,

            'non-numeric string != int': true,
            'non-numeric string != float': true,

            'empty string != string': true
        });
    });

    it('should be able to loosely compare values using "<>"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['string <> same string'] = 'hello' <> 'hello';
$result['string <> different string'] = 'hello' <> 'world';

$result['int string <> same int'] = '21' <> 21;
$result['int string <> different int'] = '21' <> 4;
$result['int string <> non-numeric string'] = '21' <> 'not a number';

$result['float string <> same float'] = '21.123' <> 21.123;
$result['float string <> different float'] = '21.123' <> 4.123;
$result['float string <> non-numeric string'] = '21.123' <> 'not a number';

$result['int string <> same float'] = '21' <> 21.0;
$result['int string <> different float'] = '21' <> 4.123;

$result['float string <> same int'] = '21.0' <> 21;
$result['float string <> different int'] = '21.123' <> 4;

$result['float string with matching prefix <> different int'] = '21.123' <> 21;
$result['float string with matching prefix <> different float'] = '21.123' <> 21.0;

$result['non-numeric string <> int'] = 'not a number' <> 123;
$result['non-numeric string <> float'] = 'not a number' <> 123.45;

$result['empty string <> string'] = '' <> 'not empty';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'string <> same string': false,
            'string <> different string': true,

            'int string <> same int': false,
            'int string <> different int': true,
            'int string <> non-numeric string': true,

            'float string <> same float': false,
            'float string <> different float': true,
            'float string <> non-numeric string': true,

            'int string <> same float': false,
            'int string <> different float': true,

            'float string <> same int': false,
            'float string <> different int': true,

            'float string with matching prefix <> different int': true,
            'float string with matching prefix <> different float': true,

            'non-numeric string <> int': true,
            'non-numeric string <> float': true,

            'empty string <> string': true
        });
    });
});
