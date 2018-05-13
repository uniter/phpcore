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
    tools = require('./tools'),
    when = require('../when');

describe('PHP asynchronous "include_once" statement integration', function () {
    it('should correctly handle including the same file multiple times', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = include_once 'abc.php';
$result[] = include_once 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            includeTransport = sinon.spy(function (path, promise, callerPath, valueFactory) {
                setTimeout(function () {
                    promise.resolve(valueFactory.createString('the one and only'));
                });
            }),
            options = {
                path: 'my/caller.php',
                include: includeTransport
            };

        module(options).execute().then(when(done, function (result) {
            expect(result.getNative()).to.deep.equal([
                'the one and only',
                true // include_once returns with bool(true) if file has already been included
            ]);
            expect(includeTransport).to.have.been.calledOnce;
        }), done);
    });
});
