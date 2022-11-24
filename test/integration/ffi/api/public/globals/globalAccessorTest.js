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
    tools = require('../../../../tools');

describe('PHP public FFI global accessors integration', function () {
    it('should support defining a global accessor whose value can be set asynchronously', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myAccessor = 21;

return $myAccessor + 6;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            myValue;
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return myValue;
            },
            function (newValue) {
                return engine.createFFIResult(
                    function () {
                        throw new Error('This test should run in async mode and use the async callback');
                    },
                    function () {
                        return new Promise(function (resolve) {
                            myValue = newValue;
                            resolve();
                        });
                    }
                );
            }
        );

        expect((await engine.execute()).getNative()).to.equal(27);
    });

    it('should support defining a global accessor whose reference can be set', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$myAccessor =& $myVar;
$myVar = 21;
$result['after assigning to variable'] = $myAccessor . ' [from module first]';

$myAccessor = 101;
$result['after assigning to accessor'] = $myAccessor . ' [from module second]';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            myReference;
        engine.defineGlobalAccessor(
            'myAccessor',
            // Define a value getter.
            function () {
                return myReference.getValue().next(function (resolvedValue) {
                    return resolvedValue.getNative() + ' [from getter]';
                });
            },
            // Define a value setter.
            function (newValue) {
                myReference.setValue(newValue);
            },
            // No unsetter.
            null,
            // Define a reference getter.
            function () {
                return myReference;
            },
            // Define a setter for further reference-assignments.
            function (reference) {
                myReference = reference;
            }
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'after assigning to variable': '21 [from getter] [from module first]',
            'after assigning to accessor': '101 [from getter] [from module second]'
        });
    });
});
