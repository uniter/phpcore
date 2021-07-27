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
    tools = require('../tools');

describe('PHP heredoc construct integration', function () {
    it('should support quoted and unquoted heredocs with variables interpolated', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$firstVar = 'there';
$secondVar = 'world';

$result = [];

$result[] = <<<UNQUOTED
Hello $firstVar

UNQUOTED; <-- Still inside
Goodbye $secondVar!
UNQUOTED;

$result[] = <<<"QUOTED"
Hello $firstVar

QUOTED; <-- Still inside

Goodbye!
QUOTED;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'Hello there\n\nUNQUOTED; <-- Still inside\nGoodbye world!',
            'Hello there\n\nQUOTED; <-- Still inside\n\nGoodbye!'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle a heredoc with references to pausing accessor variables', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myHeredoc = <<<HEREDOC
First, here is $firstAccessorGlobal
and here is $secondAccessorGlobal!
HEREDOC;

return $myHeredoc;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module();
        engine.defineGlobalAccessor(
            'firstAccessorGlobal',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve('My first var');
                    });
                });
            }
        );
        engine.defineGlobalAccessor(
            'secondAccessorGlobal',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve('My second var');
                    });
                });
            }
        );

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.equal(
                'First, here is My first var\n' +
                'and here is My second var!'
            );
            expect(engine.getStderr().readAll()).to.equal('');
        });
    });

    it('should correctly handle a heredoc with reference to instance of class implementing __toString()', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myString = 'Initial';

class MyClass
{
    public function __toString()
    {
        global $myString;

        // Append a string to test that __toString() result is not cached anywhere, and include a future
        // to test that the opcode handler correctly handles pauses during coercion
        $myString .= get_async(' [call]');

        return $myString;
    }
}

$myObject = new MyClass;

$myHeredoc = <<<HEREDOC
First, here is $myObject
and here is $myObject!
HEREDOC;

return $myHeredoc;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(value);
                    });
                });
            };
        });

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.equal(
                'First, here is Initial [call]\n' +
                'and here is Initial [call] [call]!' // Note there are two [call]s the second time
            );
            expect(engine.getStderr().readAll()).to.equal('');
        });
    });
});
