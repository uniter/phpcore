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

describe('PHP variable static method call integration', function () {
    it('should correctly handle calling a static method dynamically', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public static function myMethod($add)
    {
        return 21 + $add;
    }
}

$myObject = new MyClass;
$myMethodName = 'myMethod';

return [
    'with dollar only' => $myObject::$myMethodName(2),
    'with braces' => $myObject::{$myMethodName}(4)
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with dollar only': 23,
            'with braces': 25
        });
    });

    it('should treat method names as case-insensitive', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public static function myMethod()
    {
        return 21;
    }
}

$myMethodName = 'myMethod';

return (new MyClass)::$myMethodName();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(21);
    });

    it('should allow a variable containing an array to be passed by-reference', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public static function myMethod(array &$theArray)
    {
        $theArray[] = 'added';
    }
}

$myMethodName = 'myMethod';
$myArray = [21, 101];
(new MyClass)::$myMethodName($myArray);

return $myArray;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            101,
            'added'
        ]);
    });
});
