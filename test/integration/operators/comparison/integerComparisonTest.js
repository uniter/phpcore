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

describe('PHP integer comparison operators integration', function () {
    it('should support all PHP comparison operators', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['int == int'] = 21 == 4;
$result['int == int string'] = 21 == '21';

$result['int === int'] = 21 === 4;
$result['int === int string'] = 21 === '21';
$result['int === same int'] = 25 === 25;

$result['int != int'] = 21 != 4;
$result['int != string int'] = 21 != '21';

$result['int <> int'] = 21 <> 4;
$result['int <> string int'] = 21 <> '21';

$result['int !== smaller int'] = 21 !== 4;
$result['int !== string int'] = 21 !== '21';
$result['int !== same int'] = 25 !== 25;

$result['int < smaller int'] = 21 < 4;
$result['int < larger int'] = 5 < 10;

$result['int > smaller int'] = 21 > 4;
$result['int > larger int'] = 5 > 10;

$result['int <= smaller int'] = 21 <= 4;
$result['int <= larger int'] = 5 <= 10;
$result['int <= same int'] = 15 <= 15;

$result['int >= smaller int'] = 21 >= 4;
$result['int >= larger int'] = 5 >= 10;
$result['int >= same int'] = 15 >= 15;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int == int': false,
            'int == int string': true,

            'int === int': false,
            'int === int string': false,
            'int === same int': true,

            'int != int': true,
            'int != string int': false,

            'int <> int': true,
            'int <> string int': false,

            'int !== smaller int': true,
            'int !== string int': true,
            'int !== same int': false,

            'int < smaller int': false,
            'int < larger int': true,

            'int > smaller int': true,
            'int > larger int': false,

            'int <= smaller int': false,
            'int <= larger int': true,
            'int <= same int': true,

            'int >= smaller int': true,
            'int >= larger int': false,
            'int >= same int': true
        });
    });
});
