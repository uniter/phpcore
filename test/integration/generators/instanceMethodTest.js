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
    tools = require('../tools');

describe('PHP generator instance method integration', function () {
    // See also test/integration/builtin/classes/GeneratorTest.js.

    it('should be able to define a generator instance method', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public function myGenerator()
    {
        yield 'my value';
    }
}

$result = [];
$myObject = new MyClass;
$generator = $myObject->myGenerator();

$result['is instance of Generator'] = $generator instanceof Generator;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'is instance of Generator': true
        });
    });
});
