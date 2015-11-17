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

describe('PHP<->JS Bridge integration', function () {
    it('should support exposing a number as a PHP global', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return $myNum + 4;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module();

        engine.expose(18, 'myNum');

        engine.execute().then(function (result) {
            expect(result.getNative()).to.equal(22);
            done();
        }, done).catch(done);
    });
});
