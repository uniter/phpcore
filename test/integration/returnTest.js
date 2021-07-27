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

describe('PHP "return" statement integration', function () {
    it('should return the expected result for a simple return statement in async mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 4;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php);

        return module().execute().then(function (result) {
            expect(result.getNative()).to.equal(4);
        });
    });

    it('should return the expected result for a simple return statement in psync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 4;
EOS
*/;}),//jshint ignore:line
            module = tools.psyncTranspile(null, php);

        return module().execute().then(function (result) {
            expect(result.getNative()).to.equal(4);
        });
    });

    it('should return the expected result for a simple return statement in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 4;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal(4);
    });
});
