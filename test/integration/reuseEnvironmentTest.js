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
    phpCore = require('../..');

describe('PHP environment reuse integration', function () {
    it('should correctly handle accessing a previously defined variable', function (done) {
        var environment = phpCore.createEnvironment(),
            php1 = nowdoc(function () {/*<<<EOS
<?php
$num = 21;
EOS
*/;}),//jshint ignore:line
            module1 = tools.asyncTranspile(null, php1),
            php2 = nowdoc(function () {/*<<<EOS
<?php
return $num + 3;
EOS
*/;}),//jshint ignore:line
            module2 = tools.asyncTranspile(null, php2);

        module1({}, environment).execute().then(function () {
            module2({}, environment).execute().then(function (result) {
                expect(result.getNative()).to.equal(24);
                done();
            }, done).catch(done);
        }, done).catch(done);
    });
});
