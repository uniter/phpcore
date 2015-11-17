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
    tools = require('../tools');

describe('PHP "function" statement integration', function () {
    it('should return the expected result for a simple return statement', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
function doNothing() {}

return doNothing();
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php);

        module().execute().then(function (result) {
            expect(result.getNative()).to.equal(null);
            done();
        }, done).catch(done);
    });
});
