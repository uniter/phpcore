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
    tools = require('../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP class constant scope resolution "::" invalid scope integration', function () {
    it('should raise a fatal error when attempting to access a constant of the current class when not inside a class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$dummy = self::SOME_CONSTANT;

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot access self:: when no class scope is active in my_module.php on line 3'
        );
    });

    it('should raise a fatal error when attempting to access a constant of the parent class when not inside a class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$dummy = parent::SOME_CONSTANT;

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot access parent:: when no class scope is active in my_module.php on line 3'
        );
    });

    it('should raise a fatal error when attempting to access a constant of the current static class scope when not inside a class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$dummy = static::SOME_CONSTANT;

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot access static:: when no class scope is active in my_module.php on line 3'
        );
    });

    it('should raise a fatal error when attempting to access a constant of the parent class when current class has no parent', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public static function myMethod() {
        $dummy = parent::SOME_CONSTANT;
    }
}

MyClass::myMethod();

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot access parent:: when current class scope has no parent in /path/to/my_module.php on line 5'
        );
    });

    it('should raise a fatal error when attempting to define a property referencing a constant of the parent class when current class has no parent', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    private $myProperty = parent::SOME_CONSTANT;
}

$object = new MyClass;

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            // TODO: This should actually report line 7, but Uniter reports the line
            //       that the actual invalid parent:: reference is on (which is probably more useful anyway)
            'PHP Fatal error: Uncaught Error: Cannot access parent:: when current class scope has no parent in /path/to/my_module.php on line 4'
        );
    });
});
