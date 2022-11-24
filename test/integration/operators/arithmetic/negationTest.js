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

describe('PHP negation operator "-" integration', function () {
    it('should support negating references and values', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$firstVar = "-21"; // Use a string to check for coercion
$secondVar = 58;
$myArray = ['myElement' => -101];

return [
    '- of negative variable value' => -$firstVar,
    '- of positive variable value' => -$secondVar,
    '- of negative array element value' => -$myArray['myElement']
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            '- of negative variable value': 21,
            '- of positive variable value': -58,
            '- of negative array element value': 101
        });
    });
});
