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
    tools = require('../../tools');

describe('PHP asynchronous "include" construct integration', function () {
    it('should correctly handle an include where the loader returns a compiled wrapper function', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            options = {
                include: function (path, promise) {
                    setTimeout(function () {
                        promise.resolve(tools.asyncTranspile(path, '<?php return 22;'));
                    });
                }
            },
            engine = module(options);

        expect((await engine.execute()).getNative()).to.equal(22);
    });

    it('should correctly handle an asynchronous rejection', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('my_module.php', php),
            options = {
                include: function (path, promise) {
                    setTimeout(function () {
                        promise.reject(new Error('Oh dear!'));
                    });
                }
            },
            engine = module(options);

        expect((await engine.execute()).getNative()).to.equal(false);
        expect(engine.getStderr().readAll()).to.equal(nowdoc(function () {/*<<<EOS
PHP Warning:  include(abc.php): failed to open stream: Oh dear! in my_module.php on line 2
PHP Warning:  include(): Failed opening 'abc.php' for inclusion in my_module.php on line 2

EOS
*/;})); //jshint ignore:line
    });

    it('should correctly trap when no include transport is configured', async function () {
        var module = tools.asyncTranspile('/path/to/my_module.php', '<?php include "no_transport.php";'),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            'include(no_transport.php) :: No "include" transport option is available for loading the module.'
        );
    });

    it('should use the same stdout stream for included modules', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
include 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            options = {
                include: function (path, promise) {
                    setTimeout(function () {
                        promise.resolve(tools.asyncTranspile(path, '<?php print 21 + 2;'));
                    });
                }
            },
            engine = module(options);

        await engine.execute();

        expect(engine.getStdout().readAll()).to.equal('before 23 after');
    });

    it('should support include transports that return a return value for the module', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num + 1;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath, valueFactory) {
                    setTimeout(function () {
                        promise.resolve(valueFactory.createInteger(123));
                    });
                }
            },
            engine = module(options);

        expect((await engine.execute()).getNative()).to.equal(124);
    });

    it('should support including the same file multiple times', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = include 'abc.php';
$result[] = include 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            results = ['first', 'second'],
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath, valueFactory) {
                    setTimeout(function () {
                        promise.resolve(valueFactory.createString(results.shift()));
                    });
                }
            },
            engine = module(options);

        expect((await engine.execute()).getNative()).to.deep.equal([
            'first',
            'second'
        ]);
    });

    it('should return int(1) when successful and the module returns no result', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['include with no result'] = include 'abc.php';

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            options = {
                path: 'my/caller.php',
                include: function (path, promise) {
                    setTimeout(function () {
                        promise.resolve(tools.asyncTranspile(path, '<?php // No content here.'));
                    });
                }
            },
            engine = module(options);

        expect((await engine.execute()).getNative()).to.deep.equal({
            'include with no result': 1
        });
    });

    it('should push and pop a call for the top level of the included module', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            options = {
                include: function (path, promise) {
                    var php = nowdoc(function () {/*<<<EOS
<?php
return 10;
EOS
*/;}, {path: path}); //jshint ignore:line
                    setTimeout(function () {
                        promise.resolve(tools.asyncTranspile(path, php));
                    });
                }
            },
            engine = module(options);

        expect((await engine.execute()).getNative()).to.equal(131);
    });

    it('should support fetching the path from accessor returning future', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['include of accessor variable containing path'] = include $myAccessor;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module({
                include: function (path, promise) {
                    var php = nowdoc(function () {/*<<<EOS
<?php
return 'path was: ${path}';
EOS
*/;}, {path: path}); //jshint ignore:line

                    setImmediate(function () {
                        promise.resolve(tools.asyncTranspile(path, php));
                    });
                }
            });
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve('/some/path/to_include.php');
                    });
                });
            }
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'include of accessor variable containing path': 'path was: /some/path/to_include.php'
        });
    });
});
