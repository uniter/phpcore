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
    Promise = require('lie'),
    tools = require('../../../../../tools');

describe('PHP builtin FFI function asynchronous mode auto-coercion integration', function () {
    it('should support installing a custom function that returns a number', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('add_one_to', function (number) {
            return number + 1;
        });

        expect((await engine.execute()).getNative()).to.equal(22);
    });

    it('should support installing a custom function with default parameter argument', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('add_one_to', function (number) {
            return number + 1;
        }, 'mixed $number = 21');

        expect((await engine.execute()).getNative()).to.equal(22);
    });

    it('should support installing a custom function with by-value parameter that receives a FutureValue', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to($myAccessor);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(21);
                    });
                });
            }
        );

        engine.defineCoercingFunction('add_one_to', function (number) {
            return number + 1;
        }, 'mixed $number');

        expect((await engine.execute()).getNative()).to.equal(22);
    });

    it('should support installing a custom function with by-reference parameter that receives a FutureValue', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to($myAccessor);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(21);
                    });
                });
            }
        );

        // Note that due to auto-coercion there is no way to access the reference.
        // In order to access the reference, auto-coercion should be disabled for the function.
        engine.defineCoercingFunction('add_one_to', function (number) {
            return number + 1;
        }, 'mixed &$number');

        expect((await engine.execute()).getNative()).to.equal(22);
    });

    it('should support installing a custom function that returns an FFIResult that resolves to a number', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21) + 100;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('add_one_to', function (number) {
            var internals = this;

            return internals.createFFIResult(function () {
                throw new Error('This test should run in async mode and use the async callback');
            }, function () {
                return Promise.resolve(number + 1);
            });
        });

        expect((await engine.execute()).getNative()).to.equal(122);
    });

    it('should support installing a custom function that receives an ObjectValue', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public function getIt() {
        return get_async(21);
    }
}

$myObject = new MyClass();
$result = get_it_and_add_two($myObject);

return $result + 4;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(value);
                });
            });
        });

        engine.defineCoercingFunction('get_it_and_add_two', function (objectArg) {
            var internals = this;

            return internals.createFFIResult(function () {
                throw new Error('This test should run in async mode and use the async callback');
            }, function () {
                /*
                 * - Uses Promise chaining
                 * - `objectArg.getIt()` returns a Promise to be resolved with the native value from
                 *   the .getIt() method being provided as a proxy by the ProxyClass generated for MyClass.
                 *   Note that that number is additionally fetched via get_async(...) - see PHP snippet above.
                 */
                return objectArg.getIt().then(function (value) {
                    return value + 2;
                });
            });
        });

        expect((await engine.execute()).getNative()).to.equal(27);
    });
});
