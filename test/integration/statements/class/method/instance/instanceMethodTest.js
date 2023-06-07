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

describe('PHP class instance method integration', function () {
    it('should support classes with an instance method called "length"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public $myProp;

    public function __construct($myVar)
    {
        $this->myProp = $myVar;
    }

    public function length()
    {
        return 21;
    }
}

$myObject = new MyClass('my value');

$result = [];
$result['prop'] = $myObject->myProp;
$result['length'] = $myObject->length();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'prop': 'my value',
            'length': 21
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
