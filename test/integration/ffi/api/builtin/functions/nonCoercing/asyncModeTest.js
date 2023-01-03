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
    tools = require('../../../../../tools'),
    Promise = require('lie');

describe('PHP builtin FFI function asynchronous mode non-coercion integration', function () {
    it('should support installing a custom function that returns a Value object', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('add_one_to', function (argReference) {
            return this.valueFactory.createInteger(argReference.getNative() + 1);
        });

        expect((await engine.execute()).getNative()).to.equal(22);
    });

    it('should support installing a custom function that returns an FFIResult that resolves to a Value object', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21) + 100;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('add_one_to', function (argReference) {
            var internals = this;

            return internals.createFFIResult(function () {
                throw new Error('This test should run in async mode and use the async callback');
            }, function () {
                return Promise.resolve(
                    internals.valueFactory.createInteger(argReference.getNative() + 1)
                );
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
        engine.defineNonCoercingFunction('get_async', function (valueReference) {
            return this.createFutureValue(function (resolve) {
                var value = valueReference.getValue();

                setImmediate(function () {
                    resolve(value);
                });
            });
        });
        engine.defineFunction('get_it_and_add_two', function (internals) {
            internals.disableAutoCoercion();

            return function (objectArgReference) {
                return internals.createFFIResult(function () {
                    throw new Error('This test should run in async mode and use the async callback');
                }, function () {
                    var asyncObject = internals.valueHelper.toValueWithAsyncApi(objectArgReference.getValue());

                    /*
                     * - Uses Promise chaining
                     * - `objectArgReference.getValue()` returns a CustomBuiltin/ObjectValue, which is a facade
                     *   that provides a minimal interface.
                     * - `CustomBuiltin/ObjectValue.callMethod(...)` then returns a Promise, resolved
                     *   with the value returned from `get_async(...)` (see PHP snippet above)
                     * - Using Promise chaining, we add 2 to the value and return the resulting Promise.
                     * - As .add(...) returns a Promise (via the facade), operator overloading
                     *   is able to handle a sleep from inside a magic `+` operator method, for example.
                     */
                    return asyncObject.callMethod('getIt').then(function (value) {
                        return value.add(internals.valueFactory.createInteger(2));
                    });
                });
            };
        });

        expect((await engine.execute()).getNative()).to.equal(27);
    });
});
