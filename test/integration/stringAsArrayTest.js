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

describe('PHP string-as-array integration', function () {
    it('should correctly handle reading a character of a string', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 'my string'[1];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php);

        expect((await module().execute()).getNative()).to.equal('y');
    });
});
