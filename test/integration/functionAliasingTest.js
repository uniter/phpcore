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

describe('PHP function aliasing integration', function () {
    it('should support aliasing functions', function () {
        var php,
            module,
            engine;

        php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Awesome\Space
{
    function myFunc($myArg) {
        return $myArg . ' was passed to ' . __FUNCTION__;
    }
}

namespace
{
    // Use our custom function to install the alias
    function_alias('My\\Awesome\\Space\\myFunc', 'myAliasFunc');

    return My\Awesome\Space\myAliasFunc(21);
}
EOS
*/;}); //jshint ignore:line
        module = tools.syncTranspile('/path/to/my_module.php', php);
        engine = module();

        engine.defineCoercingFunction('function_alias', function (originalName, aliasName) {
            engine.aliasFunction(originalName, aliasName);
        });

        engine.execute();

        expect(engine.execute().getNative()).to.equal('21 was passed to My\\Awesome\\Space\\myAliasFunc');
    });
});
