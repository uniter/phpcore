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

describe('PHP division operator "/" integration', function () {
    it('should support dividing different types of value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return [
    'int / int' => 20 / 5,
    'float / int' => 10.4 / 2,
    'int / float' => 3 / 1.5,
    'int / string' => 4.2 / "2.1",
    'string / int' => "4.4" / 2,
    'int / bool (true coerced to 1)' => 15 / true,
    'bool / int (true coerced to 1)' => true / 4,
    'null / int (null coerces to 0)' => null / 20
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'int / int': 4,
            'float / int': 5.2,
            'int / float': 2,
            'int / string': 2,
            'string / int': 2.2,
            'int / bool (true coerced to 1)': 15,
            'bool / int (true coerced to 1)': 0.25,
            'null / int (null coerces to 0)': 0 // Note that this isn't division *by* zero
        });
    });

    it('should raise a warning and return false on divide by zero', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return 100 / 0;
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
