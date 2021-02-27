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
    tools = require('./tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP synchronous "require_once" statement integration', function () {
    it('should correctly handle including the same file multiple times', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = require_once 'abc.php';
$result[] = require_once 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            includeTransport = sinon.spy(function (path, promise, callerPath, valueFactory) {
                promise.resolve(valueFactory.createString('the one and only'));
            }),
            options = {
                path: 'my/caller.php',
                include: includeTransport
            };

        expect(module(options).execute().getNative()).to.deep.equal([
            'the one and only',
            true // require_once returns with bool(true) if file has already been included
        ]);
        expect(includeTransport).to.have.been.calledOnce;
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
            module = tools.syncTranspile(null, php),
            includeTransport = sinon.spy(function (path, promise, callerPath, valueFactory) {
                promise.resolve(valueFactory.createString('the one and only'));
            }),
            options = {
                path: 'my/caller.php',
                include: includeTransport
            };

        expect(module(options).execute().getNative()).to.deep.equal([
            'the one and only',
            true // require_once returns with bool(true) if file has already been included
        ]);
        expect(includeTransport).to.have.been.calledOnce;
    });

    it('should correctly handle a rejection', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = require_once 'abc.php';
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
            'PHP Fatal error: require_once(): Failed opening \'abc.php\' for inclusion in a_module.php on line 2'
        );
        expect(engine.getStderr().readAll()).to.equal(nowdoc(function () {/*<<<EOS
PHP Warning:  require_once(abc.php): failed to open stream: Include failed in a_module.php on line 2
PHP Fatal error:  require_once(): Failed opening 'abc.php' for inclusion in a_module.php on line 2

EOS
*/;})); //jshint ignore:line
    });
});
