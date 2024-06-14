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

describe('PHP builtin FFI function non-coercion variadic parameter integration', function () {
    it('should support functions with only a variadic parameter', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return my_sum(7, 21, 4);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            resultValue;
        engine.defineNonCoercingFunction(
            'my_sum',
            function (...myNumberValues) {
                var sum = 0;

                myNumberValues.forEach(function (numberValue) {
                    sum += numberValue.getNative();
                });

                return this.valueFactory.createInteger(sum);
            },
            'int ...$myNumbers : int'
        );

        resultValue = await engine.execute();

        expect(resultValue.getType()).to.equal('int');
        expect(resultValue.getNative()).to.equal(32);
    });

    it('should support variadic parameters being passed no arguments at all', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// Note that an argument is passed for $myFirstNumber but none at all for the variadic $myOtherNumbers.
return my_sum(7);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            resultValue;
        engine.defineNonCoercingFunction(
            'my_sum',
            function (myFirstNumberValue, ...myOtherNumberValues) {
                var sum = myFirstNumberValue.getNative();

                myOtherNumberValues.forEach(function (numberValue) {
                    sum += numberValue.getNative();
                });

                return this.valueFactory.createInteger(sum);
            },
            'int $myFirstNumber, int ...$myOtherNumbers : int'
        );

        resultValue = await engine.execute();

        expect(resultValue.getType()).to.equal('int');
        expect(resultValue.getNative()).to.equal(7);
    });

    it('should support by-reference variadic parameters', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$first = 10;
$second = 12;
$third = 14;
$fourth = 16;

double_them($first, $second, $third, $fourth);

return [
    'first * 2' => $first,
    'second * 2' => $second,
    'third * 2' => $third,
    'fourth * 2' => $fourth
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            resultValue;
        engine.defineNonCoercingFunction(
            'double_them',
            function (myFirstNumberReference, ...myOtherNumberReferences) {
                var flow = this.flow,
                    valueFactory = this.valueFactory;

                return myFirstNumberReference.getValue().next(function (myFirstNumberValue) {
                    myFirstNumberReference.setValue(valueFactory.createInteger(myFirstNumberValue.getNative() * 2));

                    return flow.eachAsync(myOtherNumberReferences, function (myOtherNumberReference) {
                        return myOtherNumberReference.getValue().next(function (myOtherNumberValue) {
                            myOtherNumberReference.setValue(
                                valueFactory.createInteger(myOtherNumberValue.getNative() * 2)
                            );
                        });
                    });
                });
            },
            'int &$myFirstNumber, int &...$myOtherNumbers : void'
        );

        resultValue = await engine.execute();

        expect(resultValue.getNative()).to.deep.equal({
            'first * 2': 20,
            'second * 2': 24,
            'third * 2': 28,
            'fourth * 2': 32
        });
    });

    it('should support variadic parameters following parameters with default arguments', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['with neither'] = my_sum(7);
$result['with no variadic arguments'] = my_sum(7, 10);
$result['with one variadic argument'] = my_sum(7, 10, 4);
$result['with several variadic arguments'] = my_sum(7, 10, 4, 8);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineNonCoercingFunction(
            'my_sum',
            function (myFirstNumberValue, mySecondNumberValue, ...myOtherNumberValues) {
                var sum = myFirstNumberValue.getNative() + mySecondNumberValue.getNative();

                myOtherNumberValues.forEach(function (numberValue) {
                    sum += numberValue.getNative();
                });

                return this.valueFactory.createInteger(sum);
            },
            'int $myFirstNumber, int $mySecondNumber = 1, int ...$myOtherNumbers : int'
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with neither': 8,
            'with no variadic arguments': 17,
            'with one variadic argument': 21,
            'with several variadic arguments': 29
        });
    });

    it('should raise a fatal error when a by-value variadic integer parameter is given an array argument', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return my_sum(7, ['not valid'], 4);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineNonCoercingFunction(
            'my_sum',
            function (...myNumberValues) {
                var sum = 0;

                myNumberValues.forEach(function (numberValue) {
                    sum += numberValue.getNative();
                });

                return this.valueFactory.createInteger(sum);
            },
            'int ...$myNumbers : int'
        );

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: my_sum(): ' +
            // Note that the parameter name is not given when variadic.
            'Argument #2 must be of type int, array given in /path/to/my_module.php:3' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr.
            ' in /path/to/my_module.php on line 3'
        );
    });

    it('should raise a fatal error when a by-reference variadic integer parameter is given a literal', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// These must be defined with integer values due to the scalar parameter type.
$myFirstVar = 100;
$mySecondVar = 200;

return my_sum($myFirstVar, 21, $mySecondVar);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineNonCoercingFunction(
            'my_sum',
            function (...myNumberValues) {
                var sum = 0;

                myNumberValues.forEach(function (numberValue) {
                    sum += numberValue.getNative();
                });

                return this.valueFactory.createInteger(sum);
            },
            'int &...$myNumbers : int'
        );

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: my_sum(): ' +
            // Note that the parameter name is not given when variadic.
            'Argument #2 could not be passed by reference in /path/to/my_module.php on line 7'
        );
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught Error: my_sum(): Argument #2 could not be passed by reference in /path/to/my_module.php:7
Stack trace:
#0 {main}
  thrown in /path/to/my_module.php on line 7

EOS
*/;}) //jshint ignore:line
        );
        // NB: Stdout should have a leading newline written out just before the message.
        expect(engine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught Error: my_sum(): Argument #2 could not be passed by reference in /path/to/my_module.php:7
Stack trace:
#0 {main}
  thrown in /path/to/my_module.php on line 7

EOS
*/;}) //jshint ignore:line
        );
    });
});
