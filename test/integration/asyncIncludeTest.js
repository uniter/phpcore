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
                    promise.resolve(tools.asyncTranspile(path, '<?php return 22;'));
                }
            };

        module(options).execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(22);
        }), done);
    });

    it('should correctly trap a parse error in included file', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            options = {
                include: function (path, promise) {
                    promise.resolve(tools.asyncTranspile(path, '<?php abab'));
                }
            };

        module(options).execute().then(function (result) {
            done(new Error('Expected rejection, got resolve: ' + result));
        }, when(done, function (error) {
            expect(error.message).to.equal('PHP Parse error: syntax error, unexpected $end in abc.php on line 1');
        }));
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
                    promise.resolve(tools.asyncTranspile(path, '<?php print 21 + 2;'));
                }
            },
            engine = module(options);

        engine.execute().then(when(done, function () {
            expect(engine.getStdout().readAll()).to.equal('before 23 after');
        }), done);
    });
});
