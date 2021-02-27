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
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP synchronous "require" statement integration', function () {
    it('should correctly handle a require where the loader returns a compiled wrapper function', function () {
        var parentPHP = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
require 'my_module.php';
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

    it('should support requiring the same file multiple times', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = require 'abc.php';
$result[] = require 'abc.php';
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

    it('should correctly handle a rejection', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = require 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('a_module.php', php),
            options = {
                include: function (path, promise) {
                    promise.reject(new Error('Include failed'));
                }
            },
            engine = module(options);

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: require(): Failed opening \'abc.php\' for inclusion in a_module.php on line 2'
        );
        expect(engine.getStderr().readAll()).to.equal(nowdoc(function () {/*<<<EOS
PHP Warning:  require(abc.php): failed to open stream: Include failed in a_module.php on line 2
PHP Fatal error:  require(): Failed opening 'abc.php' for inclusion in a_module.php on line 2

EOS
*/;})); //jshint ignore:line
    });
});
