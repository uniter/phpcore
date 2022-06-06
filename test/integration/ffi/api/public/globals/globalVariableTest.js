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
    tools = require('../../../../tools');

describe('PHP public FFI global variables integration', function () {
    it('should support defining a global variable from a native value', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return $myGlobal + 6;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobal('myGlobal', 21);

        expect((await engine.execute()).getNative()).to.equal(27);
    });
});
