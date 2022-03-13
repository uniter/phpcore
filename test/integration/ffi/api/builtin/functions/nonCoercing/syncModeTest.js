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

describe('PHP builtin FFI function synchronous mode non-coercion integration', function () {
    it('should support installing a custom function that returns a Value object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('add_one_to', function (argReference) {
            return this.valueFactory.createInteger(argReference.getNative() + 1);
        });

        expect(engine.execute().getNative()).to.equal(22);
    });

    it('should support installing a custom function with optional by-value parameter', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('add_one_to', function (numberValue) {
            return this.valueFactory.createInteger(numberValue.getNative() + 1);
        }, 'mixed $number = 21');

        expect(engine.execute().getNative()).to.equal(22);
    });

    it('should support installing a custom function with by-reference parameter', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = 21;

add_one_to($result);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('add_one_to', function (numberReference) {
            var internals = this;

            return numberReference.getValue().next(function (numberValue) {
                numberReference.setValue(numberValue.add(internals.valueFactory.createInteger(1)));
            });
        }, 'mixed &$number');

        expect(engine.execute().getNative()).to.equal(22);
    });

    it('should support installing a custom function that returns an FFIResult that resolves to a Value object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21) + 100;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('add_one_to', function (argReference) {
            var internals = this;

            return internals.createFFIResult(function () {
                return internals.valueFactory.createInteger(argReference.getNative() + 1);
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

        engine.defineNonCoercingFunction('get_it_and_add_two', function (objectArgReference) {
            return objectArgReference.getValue().callMethod('getIt').add(this.valueFactory.createInteger(2));
        });

        expect(engine.execute().getNative()).to.equal(27);
    });
});
