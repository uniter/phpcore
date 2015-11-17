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

describe('PHP magic constant integration', function () {
    it('should support the __CLASS__ magic constant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\App;

function myFunction()
{
    return __CLASS__;
}

class MyClass
{
    public static function myStaticMethod()
    {
        return __CLASS__;
    }

    public function myInstanceMethod()
    {
        return __CLASS__;
    }
}

$result = array(__CLASS__);
$result[] = myFunction();
$result[] = MyClass::myStaticMethod();
$result[] = (new MyClass())->myInstanceMethod();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            '', // No current class when in global scope
            '', // No current class when inside a normal function
            'My\\App\\MyClass', // From a static method
            'My\\App\\MyClass'  // From a instance method
        ]);
    });

    it('should support the __FUNCTION__ magic constant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\App;

function myFunction()
{
    return __FUNCTION__;
}

class MyClass
{
    public static function myStaticMethod()
    {
        return __FUNCTION__;
    }

    public function myInstanceMethod()
    {
        return __FUNCTION__;
    }
}

$result = array(__FUNCTION__);
$result[] = myFunction();
$result[] = MyClass::myStaticMethod();
$result[] = (new MyClass())->myInstanceMethod();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            '', // No current function when in global scope
            'My\\App\\myFunction', // Normal functions are prefixed with the namespace
            'myStaticMethod',   // Static methods are not prefixed with the class name or namespace
            'myInstanceMethod'  // Instance methods are not prefixed with the class name or namespace
        ]);
    });
});
