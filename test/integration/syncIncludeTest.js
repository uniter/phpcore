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
    phpCommon = require('phpcommon'),
    nowdoc = require('nowdoc'),
    tools = require('./tools'),
    PHPParseError = phpCommon.PHPParseError;

describe('PHP synchronous "include" statement integration', function () {
    it('should correctly handle an include where the loader returns a compiled wrapper function', function () {
        var parentPHP = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
include 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            parentModule = tools.syncTranspile(null, parentPHP),
            childPHP = nowdoc(function () {/*<<<EOS
<?php
print 'inside';
EOS
*/;}), //jshint ignore:line
            childModule = tools.syncTranspile(null, childPHP),
            options = {
                include: function (path, promise) {
                    promise.resolve(childModule);
                }
            },
            engine = parentModule(options);

        engine.execute();

        expect(engine.getStdout().readAll()).to.equal('before inside after');
    });

    it('should pass the calling file\'s path to the transport', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath) {
                    promise.resolve(tools.syncTranspile(path, '<?php return "Hello from ' + callerPath + '!";'));
                }
            };

        expect(module(options).execute().getNative()).to.equal('Hello from my/caller.php!');
    });

    it('should correctly handle a rejection', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                include: function (path, promise) {
                    promise.reject();
                }
            },
            engine = module(options);

            expect(engine.execute().getNative()).to.equal(false);
            expect(engine.getStderr().readAll()).to.equal(nowdoc(function () {/*<<<EOS
PHP Warning: include(abc.php): failed to open stream: No such file or directory
PHP Warning: include(): Failed opening 'abc.php' for inclusion

EOS
*/;})); //jshint ignore:line
    });

    it('should correctly trap a parse error in included file', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                include: function (path, promise) {
                    promise.resolve(tools.syncTranspile(path, '<?php abab'));
                }
            };

        expect(function () {
            module(options).execute();
        }).to.throw(PHPParseError, 'PHP Parse error: syntax error, unexpected $end in abc.php on line 1');
    });

    it('should correctly trap when no include transport is configured', function () {
        var module = tools.syncTranspile(null, '<?php include "no_transport.php";');

        expect(function () {
            module().execute();
        }).to.throw('include(no_transport.php) :: No "include" transport is available for loading the module.');
    });

    it('should use the same stdout stream for included modules', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
include 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                include: function (path, promise) {
                    promise.resolve(tools.syncTranspile(path, '<?php print 21 + 2;'));
                }
            },
            engine = module(options);

        engine.execute();

        expect(engine.getStdout().readAll()).to.equal('before 23 after');
    });

    it('should support include transports that return a return value for the module', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num + 1;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath, valueFactory) {
                    promise.resolve(valueFactory.createInteger(321));
                }
            };

        expect(module(options).execute().getNative()).to.equal(322);
    });

    it('should support including the same file multiple times', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = include 'abc.php';
$result[] = include 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            results = ['first', 'second'],
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath, valueFactory) {
                    promise.resolve(valueFactory.createString(results.shift()));
                }
            };

        expect(module(options).execute().getNative()).to.deep.equal([
            'first',
            'second'
        ]);
    });

    it('should evaluate an included module in the scope the `include` statement is in', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunc() {
    $myVar = 21;

    return include 'my_module.php';
}

return myFunc();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                include: function (path, promise) {
                    var php = nowdoc(function () {/*<<<EOS
<?php
return ($myVar * 2) . ' from ${path}';
EOS
*/;}, {path: path}); //jshint ignore:line
                    promise.resolve(tools.syncTranspile(path, php));
                }
            },
            engine = module(options);

        expect(engine.execute().getNative()).to.equal('42 from my_module.php');
    });

    it('should push and pop a call for the top level of the included module', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    private static $firstProp = 21;

    public static function includeIt()
    {
        // Call here, before the static:: access below, to ensure the correct static class scope
        // is restored after the include (see below)
        $fetchedValue = YourClass::getIt();

        return static::$firstProp + $fetchedValue;
    }
}

class YourClass
{
    private static $secondProp = 100;

    public static function getIt()
    {
        // The scope of the top-level of the included module will be this method's,
        // so the caller's use of static:: will ensure that the top-level call
        // for this include is correctly popped off the stack again.
        $includedValue = include 'my_module.php';

        return static::$secondProp + $includedValue;
    }
}

return MyClass::includeIt();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                include: function (path, promise) {
                    var php = nowdoc(function () {/*<<<EOS
<?php
return 10;
EOS
*/;}, {path: path}); //jshint ignore:line
                    promise.resolve(tools.syncTranspile(path, php));
                }
            },
            engine = module(options);

        expect(engine.execute().getNative()).to.equal(131);
    });
});
