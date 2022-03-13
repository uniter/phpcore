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
    tools = require('./tools');

describe('PHP late static binding integration', function () {
    it('should support forwarding and non-forwarding static calls', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// From http://php.net/manual/en/language.oop5.late-static-bindings.php
class A {
    public static function foo() {
        static::who();
    }

    public static function who() {
        echo __CLASS__."\n";
    }
}

class B extends A {
    public static function test() {
        A::foo();
        parent::foo();
        self::foo();
    }

    public static function who() {
        echo __CLASS__."\n";
    }
}

class C extends B {
    public static function who() {
        echo __CLASS__."\n";
    }
}

C::test();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.execute();

        expect(engine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
A
C
C

EOS
*/;}) //jshint ignore:line
        );
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support late-bound static property access from forwarded and non-forwarded contexts', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

class A {
    private static $myProp = 'from A';

    public static function inheritedMethod() {
        static::readStaticProp();
    }

    public static function readStaticProp() {
        $GLOBALS['result'][] = static::$myProp;
    }
}

class B extends A {
    private static $myProp = 'from B';

    public static function runTest() {
        A::inheritedMethod();
        parent::inheritedMethod();
        self::inheritedMethod();
    }

    public static function readStaticProp() {
        $GLOBALS['result'][] = static::$myProp;
    }
}

class C extends B {
    private static $myProp = 'from C';

    public static function readStaticProp() {
        $GLOBALS['result'][] = static::$myProp;
    }
}

C::runTest();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'from A',
            'from C',
            'from C'
        ]);
    });
});
