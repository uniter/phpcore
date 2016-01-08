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
    asyncPHPCore = require('../../async'),
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    tools = require('./tools'),
    when = require('../when');

describe('PHP asynchronous "include" statement integration', function () {
    it('should correctly handle an include where the loader returns a compiled wrapper function', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            options = {
                include: function (path, promise) {
                    setTimeout(function () {
                        promise.resolve(tools.asyncTranspile(path, '<?php return 22;'));
                    });
                }
            };

        module(options).execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(22);
        }), done);
    });

    it('should correctly handle an asynchronous rejection', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            options = {
                include: function (path, promise) {
                    setTimeout(function () {
                        promise.reject();
                    });
                }
            },
            engine = module(options);

        engine.execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(false);
            expect(engine.getStderr().readAll()).to.equal(nowdoc(function () {/*<<<EOS
PHP Warning: include(abc.php): failed to open stream: No such file or directory
PHP Warning: include(): Failed opening 'abc.php' for inclusion

EOS
*/;})); //jshint ignore:line
        }), done);
    });

    it('should correctly trap when no include transport is configured', function (done) {
        var module = tools.asyncTranspile(null, '<?php include "no_transport.php";');

        module().execute().then(function (result) {
            done(new Error('Expected rejection, got resolve: ' + result));
        }, when(done, function (error) {
            expect(error.message).to.equal(
                'include(no_transport.php) :: No "include" transport is available for loading the module.'
            );
        }));
    });

    it('should use the same stdout stream for included modules', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
include 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return asyncPHPCore;
            }),
            options = {
                include: function (path, promise) {
                    setTimeout(function () {
                        promise.resolve(tools.asyncTranspile(path, '<?php print 21 + 2;'));
                    });
                }
            },
            engine = module(options);

        engine.execute().then(when(done, function () {
            expect(engine.getStdout().readAll()).to.equal('before 23 after');
        }), done);
    });

    it('should support include transports that return a return value for the module', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num + 1;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath, valueFactory) {
                    setTimeout(function () {
                        promise.resolve(valueFactory.createInteger(123));
                    });
                }
            };

        module(options).execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(124);
        }), done);
    });

    it('should support including the same file multiple times', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = include 'abc.php';
$result[] = include 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            results = ['first', 'second'],
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath, valueFactory) {
                    setTimeout(function () {
                        promise.resolve(valueFactory.createString(results.shift()));
                    });
                }
            };

        module(options).execute().then(when(done, function (result) {
            expect(result.getNative()).to.deep.equal([
                'first',
                'second'
            ]);
        }), done);
    });
});
