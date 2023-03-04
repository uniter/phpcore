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

describe('PHP number strict inequality comparison operator "!==" integration', function () {
    it('should be able to strictly compare numeric values', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['int !== same int'] = 21 !== 21;
$result['int !== different int'] = 21 !== 4;

$result['float !== same float'] = 21.123 !== 21.123;
$result['float !== different float'] = 21.123 !== 4.567;

$result['int !== same float'] = 21 !== 21.0;
$result['int !== different float'] = 21 !== 21.123;

$result['float !== same int'] = 21.0 !== 21;
$result['float !== different int'] = 21.123 !== 4;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int !== same int': false,
            'int !== different int': true,

            'float !== same float': false,
            'float !== different float': true,

            'int !== same float': true, // Different types, so unequal despite being the same number.
            'int !== different float': true,

            'float !== same int': true, // As above.
            'float !== different int': true
        });
    });
});
