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

describe('PHP "break" statement integration', function () {
    it('should stop a for loop from executing further', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
for ($i = 0; $i < 4; $i++) {
    $result[] = $i;

    if ($i === 2) {
        break;
    }
}
$result[] = 'end';

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([0, 1, 2, 'end']);
    });

    it('should be able to break out of a nested loop', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
for ($i = 0; $i < 4; $i++) {
    $result[] = $i;

    if ($i === 2) {
        while (true) {
            break 2;
        }
    }
}
$result[] = 'end';

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([0, 1, 2, 'end']);
    });
});
