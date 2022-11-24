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

describe('PHP class static method integration', function () {
    it('should support classes with a static method called "length"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public static $myProp;

    public static function setProp($myVar)
    {
        self::$myProp = $myVar;
    }

    public static function length()
    {
        return 21;
    }
}

MyClass::setProp('my value');

$result = [];
$result['prop'] = MyClass::$myProp;
$result['length'] = MyClass::length();

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
