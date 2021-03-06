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
});
