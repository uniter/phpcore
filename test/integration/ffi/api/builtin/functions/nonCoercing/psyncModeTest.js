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

describe('PHP builtin FFI function Promise-synchronous mode non-coercion integration', function () {
    it('should support installing a custom function that returns a Value object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21);
EOS
*/;}), //jshint ignore:line
            module = tools.psyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('add_one_to', function (argReference) {
            return this.valueFactory.createInteger(argReference.getNative() + 1);
        });

        return engine.execute().then(function (result) {
            expect(result.getNative()).to.equal(22);
        });
    });

    it('should support installing a custom function that returns an FFIResult that resolves to a Value object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21) + 100;
EOS
*/;}), //jshint ignore:line
            module = tools.psyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('add_one_to', function (argReference) {
            var internals = this;

            return internals.createFFIResult(function () {
                // Note that this sync fetcher must be used in psync mode, because the runtime
                // would be unable to wait for a Promise (as would be returned by the async fetcher)
                // to be resolved
                return internals.valueFactory.createInteger(argReference.getNative() + 1);
            }, function () {
                throw new Error('This test should run in psync mode and use the sync callback');
            });
        });

        return engine.execute().then(function (result) {
            expect(result.getNative()).to.equal(122);
        });
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
            module = tools.psyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('get_it_and_add_two', function (objectValue) {
            var internals = this;

            return internals.createFFIResult(function () {
                return objectValue.callMethod('getIt').next(function (resultValue) {
                    return resultValue.add(internals.valueFactory.createInteger(2));
                });
            }, function () {
                throw new Error('This test should run in psync mode and use the sync callback');
            });
        }, 'object $object');

        return engine.execute().then(function (result) {
            expect(result.getNative()).to.equal(27);
        });
    });
});
