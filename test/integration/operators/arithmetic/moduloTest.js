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

describe('PHP modulo operator "%" integration', function () {
    it('should support calculating the modulo of different types of value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return [
    20 % 5,
    22 % 5,
    10.4 % 2,
    10.4 % 3,
    15 % true,
    '105.4' % 10,
    null % 20
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            0,  // Integer division
            2,  // Integer division
            0,  // Float division
            1,  // Float division
            0,  // Division by 1 (true coerced to 1)
            5,  // String division
            0   // Division of 0 (null coerces to 0) - note that this isn't division *by* zero
        ]);
    });

    it('should raise a warning and return false on divide by zero', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return 100 % 0;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module(),
            resultValue = engine.execute();

        expect(resultValue.getType()).to.equal('boolean');
        expect(resultValue.getNative()).to.equal(false);
        // TODO: In PHP 7 this should actually be:
        //       "PHP Fatal error:  Uncaught DivisionByZeroError: Modulo by zero in my_module.php:3"
        expect(engine.getStderr().readAll()).to.equal('PHP Warning:  Division by zero in my_module.php on line 3\n');
    });
});
