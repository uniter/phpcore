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
    tools = require('../../../../tools');

describe('PHP class instance method named argument integration', function () {
    it('should support named arguments', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function myMethod(int $first, int $second, int $third): string
    {
        return "->myMethod('$first', '$second', '$third')";
    }
}

$myObject = new MyClass('my value');

$result = [];
$result['named arguments only'] = $myObject->myMethod(second: 42, first: 21, third: 100); // Note arguments in different order.
$result['both named and positional arguments'] = $myObject->myMethod(21, third: 100, second: 42);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'named arguments only': '->myMethod(\'21\', \'42\', \'100\')',
            'both named and positional arguments': '->myMethod(\'21\', \'42\', \'100\')'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
