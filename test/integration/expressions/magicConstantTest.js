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

    it('should support the __DIR__ magic constant for a script inside a subfolder', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\App;

function myFunction()
{
    return __DIR__;
}

class MyClass
{
    public static function myStaticMethod()
    {
        return __DIR__;
    }

    public function myInstanceMethod()
    {
        return __DIR__;
    }
}

$result = array(__DIR__);
$result[] = myFunction();
$result[] = MyClass::myStaticMethod();
$result[] = (new MyClass())->myInstanceMethod();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('path/to/the/dir/of_my_module', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'path/to/the/dir',
            'path/to/the/dir',
            'path/to/the/dir',
            'path/to/the/dir'
        ]);
    });

    it('should support the __DIR__ magic constant for a script inside the root folder', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = __DIR__;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_root_script.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            ''
        ]);
    });

    it('should support the __FILE__ magic constant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\App;

function myFunction()
{
    return __FILE__;
}

class MyClass
{
    public static function myStaticMethod()
    {
        return __FILE__;
    }

    public function myInstanceMethod()
    {
        return __FILE__;
    }
}

$result = array(__FILE__);
$result[] = myFunction();
$result[] = MyClass::myStaticMethod();
$result[] = (new MyClass())->myInstanceMethod();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('path/to/my_module', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'path/to/my_module',
            'path/to/my_module',
            'path/to/my_module',
            'path/to/my_module'
        ]);
    });

    it('should support the __LINE__ magic constant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\App;

function myFunction()
{
    return __LINE__;
}

class MyClass
{
    public static function myStaticMethod()
    {
        return __LINE__;
    }

    public function myInstanceMethod()
    {
        return __LINE__;
    }
}

$result = array(__LINE__);
$result[] = myFunction();
$result[] = MyClass::myStaticMethod();
$result[] = (new MyClass())->myInstanceMethod();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            22,
            6,
            13,
            18
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

    public static function callClosure()
    {
        $closure = function () {
            return __FUNCTION__;
        };
        return $closure();
    }
}

$result = array(__FUNCTION__);
$result[] = myFunction();
$result[] = MyClass::myStaticMethod();
$result[] = (new MyClass())->myInstanceMethod();
$result[] = (function () {
    return __FUNCTION__;
})();
$result[] = MyClass::callClosure();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            '', // No current function when in global scope
            'My\\App\\myFunction',  // Normal functions are prefixed with the namespace
            'myStaticMethod',       // Static methods are not prefixed with the class name or namespace
            'myInstanceMethod',     // Instance methods are not prefixed with the class name or namespace
            'My\\App\\{closure}',   // Closure defined outside of class or function
            'My\\App\\{closure}'    // Closure defined inside static method
        ]);
    });

    it('should support the __METHOD__ magic constant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\App;

function myFunction()
{
    return __METHOD__;
}

class MyClass
{
    public static function myStaticMethod()
    {
        return __METHOD__;
    }

    public function myInstanceMethod()
    {
        return __METHOD__;
    }

    public static function callClosure()
    {
        $closure = function () {
            return __METHOD__;
        };
        return $closure();
    }
}

$result = array(__METHOD__);
$result[] = myFunction();
$result[] = MyClass::myStaticMethod();
$result[] = (new MyClass())->myInstanceMethod();
$result[] = (function () {
    return __METHOD__;
})();
$result[] = MyClass::callClosure();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            // No current method when in global scope
            '',
            // Normal functions are still supported and are prefixed with the namespace
            'My\\App\\myFunction',
            // Static methods are prefixed with class name and namespace and use ::
            'My\\App\\MyClass::myStaticMethod',
            // Instance methods are prefixed with class name and namespace and _do_ also use ::
            'My\\App\\MyClass::myInstanceMethod',
            // Closure defined outside of class or function
            'My\\App\\{closure}',
            // Closure defined inside static method
            'My\\App\\{closure}'
        ]);
    });

    it('should support the __NAMESPACE__ magic constant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace {
    $result = array(__NAMESPACE__);
}

namespace My\App {
    function myFunction()
    {
        return __NAMESPACE__;
    }

    class MyClass
    {
        public static function myStaticMethod()
        {
            return __NAMESPACE__;
        }

        public function myInstanceMethod()
        {
            return __NAMESPACE__;
        }
    }

    $result[] = myFunction();
    $result[] = MyClass::myStaticMethod();
    $result[] = (new MyClass())->myInstanceMethod();
    $result[] = function () {
        return __NAMESPACE__;
    }();
}

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            '',         // Global namespace has no name
            'My\\App',  // Normal functions
            'My\\App',  // Static methods
            'My\\App',  // Instance methods
            'My\\App'   // Closures
        ]);
    });
});
