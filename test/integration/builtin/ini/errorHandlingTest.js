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
    tools = require('../../tools');

describe('PHP error handling default INI options integration', function () {
    it('should define all the correct default error handling INI options', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return [
    ini_get('display_errors'),
    ini_get('error_reporting')
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            true, // display_errors
            22519 // error_reporting: E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED
        ]);
    });
});
