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

describe('PHP comparison operators integration', function () {
    it('should support all PHP comparison operators', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = 21 == 4;
$result[] = 21 == '21';

$result[] = 21 === 4;
$result[] = 21 === '21';
$result[] = 25 === 25;

$result[] = 21 != 4;
$result[] = 21 != '21';

$result[] = 21 <> 4;
$result[] = 21 <> '21';

$result[] = 21 !== 4;
$result[] = 21 !== '21';
$result[] = 25 !== 25;

$result[] = 21 < 4;
$result[] = 5 < 10;

$result[] = 21 > 4;
$result[] = 5 > 10;

$result[] = 21 <= 4;
$result[] = 5 <= 10;
$result[] = 15 <= 15;

$result[] = 21 >= 4;
$result[] = 5 >= 10;
$result[] = 15 >= 15;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            false,
            true,

            false,
            false,
            true,

            true,
            false,

            true,
            false,

            true,
            true,
            false,

            false,
            true,

            true,
            false,

            false,
            true,
            true,

            true,
            false,
            true
        ]);
    });
});
