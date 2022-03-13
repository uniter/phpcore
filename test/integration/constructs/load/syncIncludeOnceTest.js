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

describe('PHP synchronous "include_once" construct integration', function () {
    it('should correctly handle including the same file multiple times with include_once(...)', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = include_once 'abc.php';
$result[] = include_once 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            includeTransport = sinon.spy(function (path, promise, callerPath, valueFactory) {
                promise.resolve(valueFactory.createString('the one and only'));
            }),
            options = {
                path: 'my/caller.php',
                include: includeTransport
            };

        expect(module(options).execute().getNative()).to.deep.equal([
            'the one and only',
            true // include_once returns with bool(true) if file has already been included
        ]);
        expect(includeTransport).to.have.been.calledOnce;
    });

    it('should correctly handle including the same file multiple times with require(...) then include_once(...)', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = require 'abc.php';
$result[] = include_once 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            includeTransport = sinon.spy(function (path, promise, callerPath, valueFactory) {
                promise.resolve(valueFactory.createString('the one and only'));
            }),
            options = {
                path: 'my/caller.php',
                include: includeTransport
            };

        expect(module(options).execute().getNative()).to.deep.equal([
            'the one and only',
            true // include_once returns with bool(true) if file has already been included
        ]);
        expect(includeTransport).to.have.been.calledOnce;
    });

    it('should correctly handle a rejection', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include_once 'abc.php';
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

        expect(engine.execute().getNative()).to.equal(false);
        expect(engine.getStderr().readAll()).to.equal(nowdoc(function () {/*<<<EOS
PHP Warning:  include_once(abc.php): failed to open stream: Include failed in a_module.php on line 2
PHP Warning:  include_once(): Failed opening 'abc.php' for inclusion in a_module.php on line 2

EOS
*/;})); //jshint ignore:line
    });
});
