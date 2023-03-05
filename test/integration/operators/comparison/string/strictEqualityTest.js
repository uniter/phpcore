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

describe('PHP string strict equality comparison operator "===" integration', function () {
    it('should be able to strictly compare values', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['string === same string'] = 'hello' === 'hello';
$result['string === different string'] = 'hello' === 'world';

$result['int string === same int'] = '21' === 21;
$result['int string === different int'] = '21' === 4;
$result['int string === non-numeric string'] = '21' === 'not a number';

$result['float string === same float'] = '21.123' === 21.123;
$result['float string === different float'] = '21.456' === 4.789;
$result['float string === non-numeric string'] = '21.123' === 'not a number';

$result['empty string === string'] = '' === 'not empty';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'string === same string': true,
            'string === different string': false,

            'int string === same int': false, // Different types, so unequal despite being the same number.
            'int string === different int': false,
            'int string === non-numeric string': false,

            'float string === same float': false, // As above.
            'float string === different float': false,
            'float string === non-numeric string': false,

            'empty string === string': false
        });
    });
});
