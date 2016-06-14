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
    tools = require('../tools'),
    PHPFatalError = require('phpcommon').PHPFatalError;

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

    it('should throw the correct error when unable to break', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
break 4;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(function () {
            module().execute();
        }).to.throw(PHPFatalError, 'Cannot break/continue 4 levels');
    });
});
