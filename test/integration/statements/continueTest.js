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

describe('PHP "continue" statement integration', function () {
    it('should jump to the next iteration of a for loop', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
for ($i = 0; $i < 4; $i++) {
    if ($i === 2) {
        continue;
    }

    $result[] = $i;
}
$result[] = 'end';

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([0, 1, 3, 'end']);
    });

    it('should be able jump to the next iteration of an outer loop', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
for ($i = 0; $i < 4; $i++) {
    if ($i === 2) {
        while (true) {
            continue 2;
        }
    }

    $result[] = $i;
}
$result[] = 'end';

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([0, 1, 3, 'end']);
    });
});
