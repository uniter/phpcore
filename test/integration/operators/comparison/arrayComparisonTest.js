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

describe('PHP array comparison operators integration', function () {
    it('should support strict equality comparisons that include arrays', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['array === same array'] = [21] === [21];
$result['array === different array'] = [21] === [101];
$result['array !== different array'] = [21] !== [101];

$result['empty array === false'] = [] === false;
$result['empty array !== false'] = [] !== false;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'array === same array': true,
            'array === different array': false,
            'array !== different array': true,

            'empty array === false': false,
            'empty array !== false': true
        });
    });

    it('should support loose equality comparisons that include arrays', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['array == same array'] = [21] == [21];
$result['array == different array'] = [21] == [101];
$result['array != different array'] = [21] != [101];

$result['empty array == false'] = [] == false;
$result['empty array != false'] = [] != false;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'array == same array': true,
            'array == different array': false,
            'array != different array': true,

            'empty array == false': true,
            'empty array != false': false
        });
    });
});
