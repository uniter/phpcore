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
    tools = require('../../../../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP builtin FFI function synchronous mode auto-coercion integration', function () {
    it('should support installing a custom function that returns a number', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('add_one_to', function (number) {
            return number + 1;
        });

        expect(engine.execute().getNative()).to.equal(22);
    });

    it('should support installing a custom function with default parameter argument used', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('add_one_to', function (number) {
            return number + 1;
        }, 'mixed $number = 21');

        expect(engine.execute().getNative()).to.equal(22);
    });

    it('should support installing a custom function with nullable parameter used', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['number array given'] = add_together([10, 12]);
$result['null given'] = add_together(null);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('add_together', function (numbers) {
            return numbers === null ? -1 : numbers[0] + numbers[1];
        }, '?array $myArray');

        expect(engine.execute().getNative()).to.deep.equal({
            'number array given': 22,
            'null given': -1
        });
    });

    it('should support installing a custom function that returns an FFIResult that resolves to a number', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21) + 100;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('add_one_to', function (number) {
            var internals = this;

            return internals.createFFIResult(function () {
                return number + 1;
            }, function () {
                throw new Error('This test should run in sync mode and use the sync callback');
            });
        });

        expect(engine.execute().getNative()).to.equal(122);
    });

    it('should support installing a custom function that receives an ObjectValue', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public function getIt() {
        return 21;
    }
}

$myObject = new MyClass();
$result = get_it_and_add_two($myObject);

return $result + 4;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('get_it_and_add_two', function (objectArg) {
            return objectArg.getIt() + 2;
        });

        expect(engine.execute().getNative()).to.equal(27);
    });

    it('should raise a fatal error when a class-typed parameter is given integer argument', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
i_want_an_object(21); // Not an object!
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('i_want_an_object', function () {}, 'My\\Stuff\\MyClass $myObject');

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Argument 1 passed to i_want_an_object() ' +
            'must be an instance of My\\Stuff\\MyClass, int given, ' +
            'called in /path/to/my_module.php on line 2 and defined in unknown:unknown in unknown on line unknown'
        );
    });

    it('should raise a fatal error when a non-nullable class-typed parameter is given null argument', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
i_want_an_object(null); // Not a valid instance!
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('i_want_an_object', function () {}, 'My\\Stuff\\MyClass $myObject');

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Argument 1 passed to i_want_an_object() ' +
            'must be an instance of My\\Stuff\\MyClass, null given, ' +
            'called in /path/to/my_module.php on line 2 and defined in unknown:unknown in unknown on line unknown'
        );
    });

    it('should raise a warning when required parameters are missing in weak type-checking mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
i_want_two_args(21);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('i_want_two_args', function () {}, 'mixed $myMixed, My\\MyClass $myObject');

        engine.execute();

        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Warning:  i_want_two_args() expects at least 2 parameters, 1 given in /path/to/my_module.php on line 2

EOS
*/;}) //jshint ignore:line
        );
    });
});
