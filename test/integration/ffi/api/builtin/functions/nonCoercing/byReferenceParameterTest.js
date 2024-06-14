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
    PHPFatalError = phpCommon.PHPFatalError,
    ReferenceSnapshot = require('../../../../../../../src/Reference/ReferenceSnapshot');

describe('PHP builtin FFI function non-coercion by-reference parameter integration', function () {
    it('should support passing undefined variables to by-reference parameters', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

// Note that $myResultVar is not defined at all beforehand.
$result['do_sum() return value'] = do_sum($myResultVar, 7, 21);
$result['$myResultVar'] = $myResultVar;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineNonCoercingFunction(
            'do_sum',
            function (resultVariable, myFirstNumberValue, mySecondNumberValue) {
                var sum = myFirstNumberValue.getNative() + mySecondNumberValue.getNative();

                // Write the result back to the variable, testing by-reference parameters.
                resultVariable.setValue(this.valueFactory.createInteger(sum));

                return this.valueFactory.createBoolean(true);
            },
            'mixed &$myResultParam, int $myFirstNumber, int $mySecondNumber : bool'
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'do_sum() return value': true,
            '$myResultVar': 28,
        });
        expect(engine.getStdout().readAll()).to.equal('');
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should provide ReferenceSnapshots of by-reference arguments', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$myVar = 21;
add_one($myVar);

return $myVar;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            capturedReference = null;
        engine.defineNonCoercingFunction(
            'add_one',
            function (myNumberReference) {
                var value;

                capturedReference = myNumberReference;

                // Value should be available synchronously.
                value = myNumberReference.getValue();

                // Write the result back to the variable, testing by-reference parameters.
                myNumberReference.setValue(this.valueFactory.createInteger(value.getNative() + 1));
            },
            'int &$myNumber : void'
        );

        expect((await engine.execute()).getNative()).to.equal(22);
        expect(engine.getStdout().readAll()).to.equal('');
        expect(engine.getStderr().readAll()).to.equal('');
        expect(capturedReference).to.be.an.instanceOf(ReferenceSnapshot);
    });

    it('should raise a fatal error when custom function is passed primitive value in weak type-checking mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

try_to_add_one(21); // Pass an immediate integer rather than a reference.

EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('try_to_add_one', function () {}, 'int &$myParam : int');

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: try_to_add_one(): Argument #1 ($myParam) could not be passed by reference ' +
            'in /path/to/my_module.php on line 3'
        );
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught Error: try_to_add_one(): Argument #1 ($myParam) could not be passed by reference in /path/to/my_module.php:3
Stack trace:
#0 {main}
  thrown in /path/to/my_module.php on line 3

EOS
*/;}) //jshint ignore:line
        );
        // NB: Stdout should have a leading newline written out just before the message.
        expect(engine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught Error: try_to_add_one(): Argument #1 ($myParam) could not be passed by reference in /path/to/my_module.php:3
Stack trace:
#0 {main}
  thrown in /path/to/my_module.php on line 3

EOS
*/;}) //jshint ignore:line
        );
    });
});
