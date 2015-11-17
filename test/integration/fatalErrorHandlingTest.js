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
    tools = require('./tools'),
    when = require('../when');

describe('Fatal error handling integration', function () {
    it('should output the correct message to stderr', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
myFunc();
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module();

        engine.execute().catch(when(done, function () {
            expect(engine.getStderr().readAll()).to.equal('PHP Fatal error: Call to undefined function myFunc()');
        }));
    });
});
