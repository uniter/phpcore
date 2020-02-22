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
    phpCommon = require('phpcommon'),
    tools = require('../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP constant scope resolution "::" integration', function () {
    // TODO: The line number should actually be that of the constant name itself - at the moment
    //       the line number of the statement will always be given. It is rare to split constant dereferences
    //       across multiple lines, though
    it('should raise a fatal error when attempting to access an undefined constant in the root namespace with namespace prefix', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

print \MY_CONST;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Undefined constant \'MY_CONST\' in my_module.php on line 3'
        );
    });

    it('should raise a fatal error when attempting to access an undefined constant in a non-root namespace', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// (Some padding to inflate the line number a bit)

print \Your\Stuff\YOUR_CONST;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('your_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Undefined constant \'Your\\Stuff\\YOUR_CONST\' in your_module.php on line 5'
        );
    });
});
