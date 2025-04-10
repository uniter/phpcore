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
    it('should support the __CLASS__ magic constant', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\App;

function myFunction()
{
    return __CLASS__;
}

trait MyTrait
{
    const MY_TRAIT_CONST = __CLASS__;
}

class MyClass
{
    use MyTrait;

    const MY_CLASS_CONST = __CLASS__;
    public $myInstanceProp = __CLASS__;
    public static $myStaticProp = __CLASS__;

    public static function myStaticMethod()
    {
        return __CLASS__;
    }

    public function myInstanceMethod()
    {
        return __CLASS__;
    }
}

$result = ['global scope' => __CLASS__];
$result['normal function'] = myFunction();
$result['class constant'] = MyClass::MY_CLASS_CONST;
$result['trait constant'] = MyClass::MY_TRAIT_CONST;
$result['static class property'] = MyClass::$myStaticProp;
$result['instance class property'] = (new MyClass)->myInstanceProp;
$result['static class method'] = MyClass::myStaticMethod();
$result['instance class method'] = (new MyClass())->myInstanceMethod();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'global scope': '', // No current class when in global scope.
            'normal function': '', // No current class when inside a normal function.
            'class constant': 'My\\App\\MyClass',
            'trait constant': 'My\\App\\MyClass', // Fetches the class that the trait is used in.
            'static class property': 'My\\App\\MyClass',
            'instance class property': 'My\\App\\MyClass',
            'static class method': 'My\\App\\MyClass',
            'instance class method': 'My\\App\\MyClass'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support the __DIR__ magic constant for a script inside a subfolder', async function () {
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
            module = tools.asyncTranspile('path/to/the/dir/of_my_module', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            'path/to/the/dir',
            'path/to/the/dir',
            'path/to/the/dir',
            'path/to/the/dir'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support the __DIR__ magic constant for a script inside the root folder', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = __DIR__;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('my_root_script.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            ''
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support the __FILE__ magic constant', async function () {
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
            module = tools.asyncTranspile('path/to/my_module', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            'path/to/my_module',
            'path/to/my_module',
            'path/to/my_module',
            'path/to/my_module'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support the __LINE__ magic constant', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            22,
            6,
            13,
            18
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support the __FUNCTION__ magic constant', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            '', // No current function when in global scope
            'My\\App\\myFunction',  // Normal functions are prefixed with the namespace
            'myStaticMethod',       // Static methods are not prefixed with the class name or namespace
            'myInstanceMethod',     // Instance methods are not prefixed with the class name or namespace
            'My\\App\\{closure}',   // Closure defined outside of class or function
            'My\\App\\{closure}'    // Closure defined inside static method
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support the __METHOD__ magic constant', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
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
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support the __NAMESPACE__ magic constant', async function () {
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

namespace {
    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            '',         // Global namespace has no name
            'My\\App',  // Normal functions
            'My\\App',  // Static methods
            'My\\App',  // Instance methods
            'My\\App'   // Closures
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support the __TRAIT__ magic constant', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\App;

function myFunction()
{
    return __TRAIT__;
}

trait MyTrait
{
    const MY_TRAIT_CONST = __TRAIT__;

    public static $myInstanceTraitProp = 'hello from instance trait property: ' . __TRAIT__;
    public static $myStaticTraitProp = 'hello from static trait property: ' . __TRAIT__;

    public static function myStaticTraitMethod()
    {
        return __TRAIT__;
    }

    public function myInstanceTraitMethod()
    {
        return __TRAIT__;
    }

    public static function myTraitMethodInvokingClosure()
    {
        $closure = function () {
            return __TRAIT__;
        };
        return $closure();
    }
}

class MyClass
{
    const MY_CLASS_CONST = __TRAIT__;

    use MyTrait;

    public static $myInstanceClassProp = __TRAIT__;
    public static $myStaticClassProp = __TRAIT__;

    public static function myStaticClassMethod()
    {
        return __TRAIT__;
    }

    public function myInstanceClassMethod()
    {
        return __TRAIT__;
    }
}

$myClosure = function () {
    return __TRAIT__;
};

$result = ['global scope' => __TRAIT__];
$result['normal function'] = myFunction();
$result['closure'] = $myClosure();
$result['class constant'] = MyClass::MY_CLASS_CONST;
$result['trait constant'] = MyClass::MY_TRAIT_CONST;
$result['static class property'] = MyClass::$myStaticClassProp;
$result['instance class property'] = MyClass::$myInstanceClassProp;
$result['static class method'] = MyClass::myStaticClassMethod();
$result['instance class method'] = (new MyClass())->myInstanceClassMethod();
$result['static trait property'] = MyClass::$myStaticTraitProp;
$result['instance trait property'] = MyClass::$myInstanceTraitProp;
$result['static trait method'] = MyClass::myStaticTraitMethod();
$result['instance trait method'] = (new MyClass())->myInstanceTraitMethod();
$result['static trait method invoking closure'] = MyClass::myTraitMethodInvokingClosure();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'global scope': '', // No current trait when in global scope.
            'closure': '', // No current trait when inside a closure.
            'normal function': '', // No current trait when inside a normal function.
            'class constant': '', // No current trait when inside a class constant.
            'trait constant': 'My\\App\\MyTrait',
            'static class property': '', // No current trait when inside a static class property.
            'instance class property': '', // No current trait when inside a class property.
            'static class method': '', // No current trait when inside a static method.
            'instance class method': '',  // No current trait when inside an instance method.
            'static trait property': 'hello from static trait property: My\\App\\MyTrait',
            'instance trait property': 'hello from instance trait property: My\\App\\MyTrait',
            'static trait method': 'My\\App\\MyTrait',
            'instance trait method': 'My\\App\\MyTrait',
            'static trait method invoking closure': 'My\\App\\MyTrait'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
