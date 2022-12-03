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

describe('PHP builtin FFI function non-coercion default argument value integration', function () {
    it('should be able to use a constant as default value', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['with argument'] = do_something(100);
$result['with no argument'] = do_something();

return $result;

EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineConstant('MY_CONST', 21);
        engine.defineNonCoercingFunction(
            'do_something',
            function (myParamValue) {
                return myParamValue.getNative() + 6;
            },
            'int $myParam = MY_CONST : int'
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with argument': 106,
            'with no argument': 27
        });
    });
});
