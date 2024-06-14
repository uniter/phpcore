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
    sinon = require('sinon'),
    tools = require('../../tools');

describe('PHP asynchronous "include_once" construct integration', function () {
    it('should correctly handle an include where the loader returns a compiled wrapper function', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = include_once 'abc.php';
$result[] = include_once 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            options = {
                include: function (path, promise) {
                    setTimeout(function () {
                        promise.resolve(tools.asyncTranspile(path, '<?php return $counter;'));
                    });
                }
            },
            engine = module(options);
        engine.defineGlobal('counter', 22);

        return engine.execute().then(function (result) {
            expect(result.getNative()).to.deep.equal([22, true]);
        });
    });

    it('should correctly handle including the same file multiple times', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = include_once 'abc.php';
$result[] = include_once 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            includeTransport = sinon.spy(function (path, promise, callerPath, valueFactory) {
                setTimeout(function () {
                    promise.resolve(valueFactory.createString('the one and only'));
                });
            }),
            options = {
                path: 'my/caller.php',
                include: includeTransport
            };

        return module(options).execute().then(function (result) {
            expect(result.getNative()).to.deep.equal([
                'the one and only',
                true // include_once returns with bool(true) if file has already been included
            ]);
            expect(includeTransport).to.have.been.calledOnce;
        });
    });

    it('should correctly handle including the same file multiple times via different paths', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['with no parent dir symbols'] = include_once '/path/to/abc.php';
$result['with parent dir symbols'] = include_once '/path/over/../to/my/../abc.php';

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            includeTransport = sinon.spy(function (path, promise, callerPath, valueFactory) {
                setTimeout(function () {
                    promise.resolve(valueFactory.createString('the one and only'));
                });
            }),
            options = {
                path: 'my/caller.php',
                include: includeTransport
            },
            engine = module(options);

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with no parent dir symbols': 'the one and only',
            // include_once(...) returns with bool(true) if file has already been included.
            'with parent dir symbols': true
        });
        expect(includeTransport).to.have.been.calledOnce;
    });

    it('should support fetching the path from accessor returning future', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['include of accessor variable containing path'] = include_once $myAccessor;

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

    it('should return int(1) when successful and the module returns no result', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['include with no result'] = include_once 'abc.php';

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
});
