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

describe('PHP string concatenation operator "." integration', function () {
    it('should support concatenating different types of value', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$two = 2;

return [
    'int . int' => 20 . 3,
    'float . int' => 10.4 . $two,
    'int . float' => $two . 10.4,
    'int . string' => $two . "4.1",
    'string . int' => "4.1" . $two,
    'int . bool (true coerced to 1)' => 15 . true,
    'bool . int (true coerced to 1)' => true . 15,
    'int . null (null coerces to 0)' => 20 . null,
    'null . int (null coerces to 0)' => null . 20
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int . int': '203',
            'float . int': '10.42',
            'int . float': '210.4',
            'int . string': '24.1',
            'string . int': '4.12',
            'int . bool (true coerced to 1)': '151',
            'bool . int (true coerced to 1)': '115',
            'int . null (null coerces to 0)': '20',
            'null . int (null coerces to 0)': '20'
        });
    });
});
