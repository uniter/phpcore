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

describe('PHP number greater-than comparison operator ">" integration', function () {
    it('should be able to compare numeric values', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['int > smaller int'] = 21 > 7;
$result['int > same int'] = 21 > 21;
$result['int > larger int'] = 21 > 100;

$result['float > smaller float'] = 21.123 > 7.456;
$result['float > same float'] = 21.123 > 21.123;
$result['float > larger float'] = 21.456 > 100.789;

$result['int > smaller float'] = 21 > 7.123;
$result['int > same float'] = 21 > 21.0;
$result['int > larger float'] = 21 > 100.456;

$result['float > smaller int'] = 21.123 > 7;
$result['float > same int'] = 21.0 > 21;
$result['float > larger int'] = 21.456 > 100;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int > smaller int': true,
            'int > same int': false,
            'int > larger int': false,

            'float > smaller float': true,
            'float > same float': false,
            'float > larger float': false,

            'int > smaller float': true, // Greater-than comparison is done loosely.
            'int > same float': false,
            'int > larger float': false,

            'float > smaller int': true, // As above.
            'float > same int': false,
            'float > larger int': false
        });
    });
});
