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

describe('PHP subtraction operator "-" integration', function () {
    it('should support subtracting different types of value', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return [
    'int - int' => 20 - 3,
    'float - int' => 10.4 - 2,
    'int - float' => 2 - 10.4,
    'int - string' => 2 - "4.5",
    'string - int' => "4.5" - 2,
    'int - bool (true coerced to 1)' => 15 - true,
    'bool - int (true coerced to 1)' => true - 15,
    'int - null (null coerces to 0)' => 20 - null,
    'null - int (null coerces to 0)' => null - 20
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int - int': 17,
            'float - int': 8.4,
            'int - float': -8.4,
            'int - string': -2.5,
            'string - int': 2.5,
            'int - bool (true coerced to 1)': 14,
            'bool - int (true coerced to 1)': -14,
            'int - null (null coerces to 0)': 20,
            'null - int (null coerces to 0)': -20
        });
    });

    it('should correctly handle passing a variable as operand that is then re-assigned within a later operand', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['assignment within operand'] = ${($myVar = 100) && false ?: 'myVar'} - ${($myVar = 22) && false ?: 'myVar'};

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php);

        expect((await module().execute()).getNative()).to.deep.equal({
            // Value should be resolved within the operand.
            'assignment within operand': 78
        });
    });
});
