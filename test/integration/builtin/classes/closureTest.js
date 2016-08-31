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
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    syncPhpCore = require('../../../../sync');

describe('PHP builtin Closure class integration', function () {
    describe('static ::bind()', function () {
        it('should support duplicating with a specific bound object', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    private $myProp = 21;

    public function myMethod($multiplier)
    {
        $myClosure = function () use ($multiplier) {
            return $this->myProp * $multiplier;
        };

        return $myClosure;
    }
}

$object = new MyClass;
$closure = $object->myMethod(2);
$newThis = new stdClass;
$newThis->myProp = 14;
$newClosure = Closure::bind($closure, $newThis);

return $newClosure();
EOS
*/;}),//jshint ignore:line,
                js = phpToJS.transpile(phpToAST.create().parse(php)),
                module = new Function(
                    'require',
                    'return ' + js
                )(function () {
                    return syncPhpCore;
                }),
                engine = module(),
                result = engine.execute();

            expect(engine.getStderr().readAll()).to.equal('');
            expect(result.getNative()).to.equal(28);
        });

        it('should support duplicating with a specific bound class but no object', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\Space
{
    class FirstClass
    {
        public function myMethod($multiplier)
        {
            $myClosure = function () use ($multiplier) {
                return self::$myProp * $multiplier;
            };

            return $myClosure;
        }
    }
}

namespace Your\Space
{
    class SecondClass
    {
        private static $myProp = 8;
    }
}

namespace
{
    $object = new My\Space\FirstClass;
    $closure = $object->myMethod(3);
    $newClosure = Closure::bind($closure, null, 'Your\Space\SecondClass');

    return $newClosure();
}
EOS
*/;}),//jshint ignore:line,
                js = phpToJS.transpile(phpToAST.create().parse(php)),
                module = new Function(
                    'require',
                    'return ' + js
                )(function () {
                    return syncPhpCore;
                }),
                engine = module(),
                result = engine.execute();

            expect(engine.getStderr().readAll()).to.equal('');
            expect(result.getNative()).to.equal(24);
        });
    });

    describe('instance ->bindTo()', function () {
        it('should support duplicating with a specific bound object', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    private $myProp = 21;

    public function myMethod($multiplier)
    {
        $myClosure = function () use ($multiplier) {
            return $this->myProp * $multiplier;
        };

        return $myClosure;
    }
}

$object = new MyClass;
$closure = $object->myMethod(2);
$newThis = new stdClass;
$newThis->myProp = 14;
$newClosure = $closure->bindTo($newThis);

return $newClosure();
EOS
*/;}),//jshint ignore:line,
                js = phpToJS.transpile(phpToAST.create().parse(php)),
                module = new Function(
                    'require',
                    'return ' + js
                )(function () {
                    return syncPhpCore;
                }),
                engine = module(),
                result = engine.execute();

            expect(engine.getStderr().readAll()).to.equal('');
            expect(result.getNative()).to.equal(28);
        });

        it('should support duplicating with a specific bound class but no object', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\Space
{
    class FirstClass
    {
        public function myMethod($multiplier)
        {
            $myClosure = function () use ($multiplier) {
                return self::$myProp * $multiplier;
            };

            return $myClosure;
        }
    }
}

namespace Your\Space
{
    class SecondClass
    {
        private static $myProp = 8;
    }
}

namespace
{
    $object = new My\Space\FirstClass;
    $closure = $object->myMethod(3);
    $newClosure = $closure->bindTo(null, 'Your\Space\SecondClass');

    return $newClosure();
}
EOS
*/;}),//jshint ignore:line,
                js = phpToJS.transpile(phpToAST.create().parse(php)),
                module = new Function(
                    'require',
                    'return ' + js
                )(function () {
                    return syncPhpCore;
                }),
                engine = module(),
                result = engine.execute();

            expect(engine.getStderr().readAll()).to.equal('');
            expect(result.getNative()).to.equal(24);
        });
    });
});
