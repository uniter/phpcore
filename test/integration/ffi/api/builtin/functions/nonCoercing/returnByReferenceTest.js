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
    tools = require('../../../../../tools');

describe('PHP builtin FFI function non-coercion return-by-reference integration', function () {
    it('should raise a notice when custom function returns primitive value in weak type-checking mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
$result = [];

$result['get_non_reference result value-assigned'] = get_non_reference();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('get_non_reference', function () {
            return 21; // Reference should be returned, but we return a primitive.
        }, ': &int');

        expect(engine.execute().getNative()).to.deep.equal({
            'get_non_reference result value-assigned': 21
        });
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Notice:  Only variable references should be returned by reference in /path/to/my_module.php on line 5

EOS
*/;}) //jshint ignore:line
        );
    });
});
