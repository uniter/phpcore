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
    tools = require('../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP "use" statement integration', function () {
    it('should allow importing a class of the same name into a different namespace', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff {
    class TheClass {
        public function getIt() {
            return '[From mine] ' . self::class;
        }
    }
}

namespace Your\Stuff {
    use My\Stuff\TheClass as MyClass; // Must be aliased to avoid a collision

    class TheClass {
        public function getIt() {
            return '[From yours] ' . MyClass::class;
        }
    }
}

namespace {
    $result = [];
    $result[] = (new My\Stuff\TheClass)->getIt();
    $result[] = (new Your\Stuff\TheClass)->getIt();

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            '[From mine] My\\Stuff\\TheClass',
            '[From yours] My\\Stuff\\TheClass'
        ]);
    });

    it('should raise a fatal error when attempting to use a defined class name as an alias', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {}

use YourClass as MyClass;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Cannot use YourClass as MyClass because the name is already in use in /path/to/module.php on line 5'
        );
    });

    it('should raise a fatal error when attempting to define a class with a name already used as an alias', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\Stuff;

use YourClass as MyClass;

class MyClass {}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Cannot declare class My\\Stuff\\MyClass because the name is already in use in /path/to/module.php on line 6'
        );
    });

    it('should raise a fatal error when attempting to define an alias that is already in use', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

use YourClass as MyClass;

use YourClass as MyClass;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Cannot use YourClass as MyClass because the name is already in use in /path/to/module.php on line 5'
        );
    });
});
