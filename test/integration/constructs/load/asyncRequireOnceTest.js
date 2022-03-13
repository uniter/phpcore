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
    sinon = require('sinon'),
    tools = require('../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP asynchronous "require_once" construct integration', function () {
    it('should correctly handle including the same file multiple times', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = require_once 'abc.php';
$result[] = require_once 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            includeTransport = sinon.spy(function (path, promise, callerPath, valueFactory) {
                setImmediate(function () {
                    promise.resolve(valueFactory.createString('the one and only'));
                });
            }),
            options = {
                path: 'my/caller.php',
                include: includeTransport
            };

        return module(options).execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal([
                'the one and only',
                true // require_once returns with bool(true) if file has already been included
            ]);
            expect(includeTransport).to.have.been.calledOnce;
        });
    });

    it('should correctly handle requiring the same file multiple times with include(...) then require_once(...)', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = include 'abc.php';
$result[] = require_once 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            includeTransport = sinon.spy(function (path, promise, callerPath, valueFactory) {
                setImmediate(function () {
                    promise.resolve(valueFactory.createString('the one and only'));
                });
            }),
            options = {
                path: 'my/caller.php',
                include: includeTransport
            };

        return module(options).execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal([
                'the one and only',
                true // require_once returns with bool(true) if file has already been included
            ]);
            expect(includeTransport).to.have.been.calledOnce;
        });
    });

    it('should support fetching the path from accessor returning future', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['require of accessor variable containing path'] = require_once $myAccessor;

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

    it('should correctly handle an asynchronous rejection', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = require_once 'abc.php';
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

        return expect(engine.execute().finally(function () {
            expect(engine.getStderr().readAll()).to.equal(nowdoc(function () {/*<<<EOS
PHP Warning:  require_once(abc.php): failed to open stream: Include failed in a_module.php on line 2
PHP Fatal error:  require_once(): Failed opening 'abc.php' for inclusion in a_module.php on line 2

EOS
*/;})); //jshint ignore:line
        })).to.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: require_once(): Failed opening \'abc.php\' for inclusion in a_module.php on line 2'
        );
    });
});
