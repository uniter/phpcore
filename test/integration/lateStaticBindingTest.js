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
            module = tools.syncTranspile(null, php),
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
});
