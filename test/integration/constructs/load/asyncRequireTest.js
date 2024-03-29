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
    tools = require('../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP asynchronous "require" construct integration', function () {
    it('should correctly handle a require where the loader returns a compiled wrapper function', function () {
        var parentPHP = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
require 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            parentModule = tools.asyncTranspile('/path/to/my_module.php', parentPHP),
            childPHP = nowdoc(function () {/*<<<EOS
<?php
print 'inside';
EOS
*/;}), //jshint ignore:line
            childModule = tools.asyncTranspile('/path/to/my_module.php', childPHP),
            options = {
                include: function (path, promise) {
                    setImmediate(function () {
                        promise.resolve(childModule);
                    });
                }
            },
            engine = parentModule(options);

        return engine.execute().then(function () {
            expect(engine.getStdout().readAll()).to.equal('before inside after');
        });
    });

    it('should support requiring the same file multiple times', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = require 'abc.php';
$result[] = require 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            results = ['first', 'second'],
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath, valueFactory) {
                    setImmediate(function () {
                        promise.resolve(valueFactory.createString(results.shift()));
                    });
                }
            };

        return module(options).execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal([
                'first',
                'second'
            ]);
        });
    });

    it('should support fetching the path from accessor returning future', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['require of accessor variable containing path'] = require $myAccessor;

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
                        resolve('/some/path/to_require.php');
                    });
                });
            }
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'require of accessor variable containing path': 'path was: /some/path/to_require.php'
        });
    });

    it('should correctly handle an asynchronous rejection', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = require 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('a_module.php', php),
            options = {
                include: function (path, promise) {
                    setImmediate(function () {
                        promise.reject(new Error('Include failed'));
                    });
                }
            },
            engine = module(options);

        await expect(engine.execute().finally(function () {
            expect(engine.getStderr().readAll()).to.equal(nowdoc(function () {/*<<<EOS
PHP Warning:  require(abc.php): failed to open stream: Include failed in a_module.php on line 2
PHP Fatal error:  require(): Failed opening 'abc.php' for inclusion in a_module.php on line 2

EOS
*/;})); //jshint ignore:line
        })).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: require(): Failed opening \'abc.php\' for inclusion in a_module.php on line 2'
        );
    });
});
