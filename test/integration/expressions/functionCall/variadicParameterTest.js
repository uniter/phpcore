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

describe('PHP function call variadic parameter integration', function () {
    it('should support unknown named arguments with variadic parameter when calling PHP userland functions', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myFunc($first, $second, $third, int ...$others) {
    $othersText = '';

    foreach ($others as $name => $value) {
        $othersText .= "($name=$value)";
    }

    return "myFunc('$first', '$second', '$third', ...: $othersText)";
}

$result = [];

$result['defined named arguments only'] = myFunc(second: 42, first: 21, third: 100); // Note arguments in different order.
$result['both known and unknown named arguments'] = myFunc(21, third: 100, second: 42, another: 101, andAnother: 202);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'defined named arguments only': 'myFunc(\'21\', \'42\', \'100\', ...: )',
            'both known and unknown named arguments': 'myFunc(\'21\', \'42\', \'100\', ...: (another=101)(andAnother=202))'
        });
    });
});
