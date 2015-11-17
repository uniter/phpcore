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
    tools = require('./tools');

describe('PHP "print" expression integration', function () {
    it('should correctly handle a print of "hello"', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
print 'hello';
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module(),
            stdoutResult = '';

        engine.getStdout().on('data', function (data) {
            stdoutResult += data;
        });

        engine.execute().then(function () {
            expect(stdoutResult).to.equal('hello');
            done();
        }, done).catch(done);
    });
});
