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
    tools = require('../tools'),
    PHPFatalError = require('phpcommon').PHPFatalError;

describe('PHP static method call integration', function () {
    it('should be able to call a static method using various mechanisms', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Lib {
    class MyClass {
        public static function myStaticMethod($number) {
            return $number;
        }
    }
}

namespace {
    $result = [];

    $result[] = My\Lib\MyClass::myStaticMethod(21);

    $myUnprefixedMethod = 'My\Lib\MyClass::myStaticMethod';
    $result[] = $myUnprefixedMethod(101);
    $myPrefixedMethod = '\My\Lib\MyClass::myStaticMethod';
    $result[] = $myPrefixedMethod(909);
    $myArrayCallable = ['My\Lib\MyClass', 'myStaticMethod'];
    $result[] = $myArrayCallable(1001);

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,  // Bareword call (most common)
            101, // Variable (dynamic) call from string, where string has no leading slash
            909, // Variable (dynamic) call from string, where string has a leading slash
            1001 // Variable (dynamic) call from array
        ]);
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

$myArray = [21, 101];
MyClass::myMethod($myArray);

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

    it('should raise a fatal error on attempting to call a static method of an integer', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myInt = 27;

$dummy = $myInt::myMethod();

EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Class name must be a valid object or a string in my_module.php on line 5'
        );
    });
});
