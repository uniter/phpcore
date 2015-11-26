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

describe('PHP array access operator integration', function () {
    it('should evaluate the expression before pushing the element onto the array', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$doPush = function () use (&$result) {
    $result[] = 21;
    return 22;
};
$result[] = $doPush();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            22
        ]);
    });
});
