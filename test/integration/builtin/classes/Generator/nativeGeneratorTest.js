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
    tools = require('../../../tools');

describe('PHP builtin Generator class native generator integration', function () {
    describe('in async mode with "for await...of", unwrapping generators for JS-land', function () {
        it('should correctly handle a generator that yields', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception {}

function myGenerator() {
    yield 'my ' . get_async('first') . ' value';

    yield 'my ' . get_async('second') . ' value';

    yield 'my ' . get_async('third') . ' value';
}

$generator = myGenerator();

return $generator;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module(),
                generator = (await engine.execute()).getNative(),
                result = [];
            engine.defineCoercingFunction('get_async', function (value) {
                return this.createAsyncPresentValue(value);
            });

            for await (let value of generator) {
                result.push(value);
            }

            expect(result).to.deep.equal([
                'my first value',
                'my second value',
                'my third value'
            ]);
        });

        it('should correctly handle a generator that returns before yielding', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception {}

function myGenerator() {
    return 'my ' . get_async('final') . ' value';

    yield 'my ' . get_async('first') . ' value';
}

$generator = myGenerator();

return $generator;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module(),
                finalValue,
                generator = (await engine.execute()).getNative(),
                nextResult,
                result = [];
            engine.defineCoercingFunction('get_async', function (value) {
                return this.createAsyncPresentValue(value);
            });

            for (;;) {
                nextResult = await generator.next();

                if (nextResult.done) {
                    finalValue = nextResult.value;
                    break;
                }

                result.push(nextResult.value);
            }

            expect(result).to.deep.equal([]);
            expect(finalValue).to.equal('my final value');
        });

        it('should correctly handle a generator that returns after yielding', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception {}

function myGenerator() {
    yield 'my ' . get_async('first') . ' value';

    return 'my ' . get_async('final') . ' value';
}

$generator = myGenerator();

return $generator;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module(),
                finalValue,
                generator = (await engine.execute()).getNative(),
                nextResult,
                result = [];
            engine.defineCoercingFunction('get_async', function (value) {
                return this.createAsyncPresentValue(value);
            });

            for (;;) {
                nextResult = await generator.next();

                if (nextResult.done) {
                    finalValue = nextResult.value;
                    break;
                }

                result.push(nextResult.value);
            }

            expect(result).to.deep.equal([
                'my first value'
            ]);
            expect(finalValue).to.equal('my final value');
        });

        it('should correctly handle a generator that has a value sent back after yielding', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception {}

function myGenerator() {
    $mySentValue = yield 'my ' . get_async('first') . ' value';

    yield 'my ' . get_async('second') . ' value after: ' . $mySentValue;
}

$generator = myGenerator();

return $generator;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module(),
                generator = (await engine.execute()).getNative(),
                nextResult,
                result = [];
            engine.defineCoercingFunction('get_async', function (value) {
                return this.createAsyncPresentValue(value);
            });

            for (;;) {
                nextResult = await generator.next('my sent value');

                if (nextResult.done) {
                    break;
                }

                result.push(nextResult.value);
            }

            expect(result).to.deep.equal([
                'my first value',
                'my second value after: my sent value'
            ]);
        });
    });
});
