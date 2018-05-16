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

describe('PHP multidimensional array integration', function () {
    it('should support implicitly creating sub-arrays', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$array = array();

$array['first key']['second key'] = 21;

return $array['first key']['second key'];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal(21);
    });
});
