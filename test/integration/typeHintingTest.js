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
    phpCommon = require('phpcommon'),
    tools = require('./tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP parameter type hinting integration', function () {
    it('should allow passing valid arguments for function parameters', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Lib {
    interface MyInterface {}

    class MyParentClass implements MyInterface {
        public $myProp = 21;
    }

    class MyChildClass extends MyParentClass {}
}

namespace {
    use My\Lib\MyInterface;
    use My\Lib\MyParentClass;
    use My\Lib\MyChildClass;

    $result = [];

    function myFunction(MyInterface $byInterface, MyParentClass $byParent, MyChildClass $byChild) {
        return $byInterface->myProp + $byParent->myProp + $byChild->myProp;
    }

    $myObject = new MyChildClass;
    $result[] = myFunction($myObject, $myObject, $myObject);

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21 + 21 + 21
        ]);
    });

    it('should allow passing valid arguments for instance and static method parameters', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Lib {
    interface MyInterface {}

    class MyParentClass implements MyInterface {
        public $myProp;

        public function __construct($val) {
            $this->myProp = $val;
        }
    }

    class MyChildClass extends MyParentClass {}
}

namespace {
    use My\Lib\MyInterface;
    use My\Lib\MyParentClass;
    use My\Lib\MyChildClass;

    $result = [];

    class MyTestClass {
        public function myInstanceMethod(MyInterface $byInterface, MyParentClass $byParent, MyChildClass $byChild) {
            return $byInterface->myProp + $byParent->myProp + $byChild->myProp;
        }

        public static function myStaticMethod(MyInterface $byInterface, MyParentClass $byParent, MyChildClass $byChild) {
            return $byInterface->myProp + $byParent->myProp + $byChild->myProp;
        }
    }

    $myObject = new MyChildClass(21);
    $result[] = (new MyTestClass)->myInstanceMethod($myObject, $myObject, $myObject);

    $yourObject = new MyChildClass(1001);
    $result[] = MyTestClass::myStaticMethod($yourObject, $yourObject, $yourObject);

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21 + 21 + 21,
            1001 + 1001 + 1001
        ]);
    });

    it('should raise a fatal error when a function argument does not match its parameter', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass {}
class YourClass {}

function myFunction(MyClass $thing) {}

$object = new YourClass;
myFunction($object);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Argument 1 passed to myFunction() must be an instance of MyClass,' +
            ' instance of YourClass given, called in /path/to/module.php on line 8 and defined in /path/to/module.php:5' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr
            ' in /path/to/module.php on line 5'
        );
    });

    it('should raise a fatal error when an instance method argument does not match its parameter', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass {}
class YourClass {}

class MyTestClass {
    public function myInstanceMethod(MyClass $thing) {}
}

$object = new YourClass;
(new MyTestClass)->myInstanceMethod($object);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Argument 1 passed to MyTestClass::myInstanceMethod() must be an instance of MyClass, ' +
            'instance of YourClass given, called in /path/to/module.php on line 10 and defined in /path/to/module.php:6' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr
            ' in /path/to/module.php on line 6'
        );
    });

    it('should raise a fatal error when a static method argument does not match its parameter', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass {}
class YourClass {}

class MyTestClass {
    public static function myStaticMethod(MyClass $thing) {}
}

$object = new YourClass;
MyTestClass::myStaticMethod($object);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Argument 1 passed to MyTestClass::myStaticMethod() must be an instance of MyClass, ' +
            'instance of YourClass given, called in /path/to/module.php on line 10 and defined in /path/to/module.php:6' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr
            ' in /path/to/module.php on line 6'
        );
    });
});
