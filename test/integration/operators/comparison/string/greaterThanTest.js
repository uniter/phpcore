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

describe('PHP string greater-than comparison operator ">" integration', function () {
    it('should be able to compare values', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['int string > smaller int'] = '21' > 7;
$result['int string > same int'] = '21' > 21;
$result['int string > larger int'] = '21' > 30;

$result['float string > smaller float'] = '21.123' > 7.456;
$result['float string > same float'] = '21.123' > 21.123;
$result['float string > larger float'] = '21.123' > 30.456;

$result['int string > smaller float'] = '21' > 7.123;
$result['int string > same float'] = '21' > 21.0;
$result['int string > larger float'] = '21' > 30.456;

$result['float string > smaller int'] = '21.123' > 7;
$result['float string > same int'] = '21.0' > 21;
$result['float string > larger int'] = '21.123' > 30;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int string > smaller int': true,
            'int string > same int': false,
            'int string > larger int': false,

            'float string > smaller float': true,
            'float string > same float': false,
            'float string > larger float': false,

            'int string > smaller float': true,
            'int string > same float': false,
            'int string > larger float': false,

            'float string > smaller int': true,
            'float string > same int': false,
            'float string > larger int': false
        });
    });
});
