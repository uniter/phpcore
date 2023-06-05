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
    tools = require('../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP builtin Generator class integration', function () {
    it('should implement Iterator (and by extension Traversable)', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    yield 'my value';
}

$result = [];
$generator = myGenerator();

$result['instanceof Iterator'] = $generator instanceof Iterator;
$result['instanceof Traversable'] = $generator instanceof Traversable;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'instanceof Iterator': true,
            'instanceof Traversable': true
        });
    });

    describe('->current()', function () {
        it('should be able to define and fetch a single yielded value from a generator', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    yield 'my value';
}

$result = [];
$generator = myGenerator();

$result['->current()'] = $generator->current();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                '->current()': 'my value'
            });
        });

        it('should be able to define and fetch a single yielded value in a generator after an async pause', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    $myValue = get_async('my value');

    yield $myValue;
}

$result = [];
$generator = myGenerator();

$result['->current()'] = $generator->current();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();
            engine.defineCoercingFunction('get_async', function (value) {
                return this.createAsyncPresentValue(value);
            });

            expect((await engine.execute()).getNative()).to.deep.equal({
                '->current()': 'my value'
            });
        });

        it('should be able to define and fetch the same yielded value from a generator multiple times', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    yield 'my only value';

    yield 'I should not be reached';
}

$result = [];
$generator = myGenerator();

$result['first ->current()'] = $generator->current();
$result['second ->current()'] = $generator->current();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'first ->current()': 'my only value',
                'second ->current()': 'my only value'
            });
        });

        it('should handle a generator that has thrown', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php
class MyException extends Exception {}

function myGenerator() {
    yield 'my value';

    throw new MyException('Bang from inside generator!');
}

$result = [];
$generator = myGenerator();

$result['first ->current()'] = $generator->current();
try {
    $generator->next();
} catch (MyException $ex) {
}
$result['second ->current()'] = $generator->current();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'first ->current()': 'my value',
                'second ->current()': null
            });
        });
    });

    describe('->getReturn()', function () {
        it('should support a generator with two yields and one return statement', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    $myFirstInput = yield 'my yielded value';
    $mySecondInput = yield 'my yielded value after: ' . $myFirstInput;

    return 'my returned value after: ' . $mySecondInput;
}

$result = [];
$generator = myGenerator();

$result['first ->key()'] = $generator->key();
$result['first ->current()'] = $generator->current();
$result['first ->send()'] = $generator->send('my first sent value');
$result['second ->key()'] = $generator->key();
$result['second ->current()'] = $generator->current();
$result['second ->send()'] = $generator->send('my second sent value');
$result['third ->key()'] = $generator->key();
$result['third ->current()'] = $generator->current();
$result['->getReturn()'] = $generator->getReturn();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'first ->key()': 0,
                'first ->current()': 'my yielded value',
                'first ->send()': 'my yielded value after: my first sent value',
                'second ->key()': 1,
                'second ->current()': 'my yielded value after: my first sent value',
                'second ->send()': null,   // Null because
                'third ->key()': null,     // the generator
                'third ->current()': null, // has finished.
                '->getReturn()': 'my returned value after: my second sent value' // Note "... second sent ...".
            });
        });

        it('should correctly handle generators that have thrown', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception {}

function myGenerator() {
    global $result;

    $result['log'][] = 'myGenerator first';
    throw new MyException('Bang from inside generator!');
    $result['log'][] = 'myGenerator second';

    yield 'my value that will never be yielded';
    $result['log'][] = 'myGenerator third';
}

$result = ['log' => []];
$generator = myGenerator();

$result['log'][] = 'main first';

try {
    $result['log'][] = 'main second';
    // Note that this assignment will not actually complete, as the exception will be raised here.
    $result['->current()'] = $generator->current();
    $result['log'][] = 'main third';
} catch (NotMyException $ex) {
    $result['log'][] = 'main fourth';
} catch (MyException $ex) {
    $result['log'][] = 'main fifth, caught: ' . $ex->getMessage();
} finally {
    $result['log'][] = 'main sixth';
}

$result['log'][] = 'main seventh';

try {
    $result['log'][] = 'main eighth';
    $result['->getReturn()'] = $generator->getReturn();
    $result['log'][] = 'main ninth';
} catch (Throwable $throwable) {
    $result['log'][] = 'main tenth, caught: ' . $throwable::class . ' "' . $throwable->getMessage() . '"';
}

$result['log'][] = 'main eleventh';

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'log': [
                    'main first',
                    'main second',
                    'myGenerator first',
                    'main fifth, caught: Bang from inside generator!',
                    'main sixth',
                    'main seventh',
                    'main eighth',
                    'main tenth, caught: Exception "Cannot get return value of a generator that hasn\'t returned"',
                    'main eleventh'
                ]
            });
        });

        it('should correctly handle generators that have not started', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    yield 'my value that will never be yielded';
}

$generator = myGenerator();

$generator->getReturn();
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            await expect(engine.execute()).to.eventually.be.rejectedWith(
                PHPFatalError,
                'PHP Fatal error: Uncaught Exception: Cannot get return value of a generator that hasn\'t returned in /path/to/my_module.php on line 9'
            );
        });
    });

    describe('->key()', function () {
        it('should be able to fetch a generated key for a yielded value', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    yield 'my first value';

    yield 'my second value';
}

$result = [];
$generator = myGenerator();

$result['first ->key()'] = $generator->key();
$result['first ->current()'] = $generator->current();
$generator->next();
$result['second ->key()'] = $generator->key();
$result['second ->current()'] = $generator->current();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'first ->key()': 0,
                'first ->current()': 'my first value',
                'second ->key()': 1,
                'second ->current()': 'my second value'
            });
        });

        it('should be able to fetch a computed key for a yielded value', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator($myPrefix) {
    yield $myPrefix . ' first' => 'my first value';

    yield $myPrefix . ' second' => 'my second value';
}

$result = [];
$generator = myGenerator('my key:');

$result['first ->key()'] = $generator->key();
$result['first ->current()'] = $generator->current();
$generator->next();
$result['second ->key()'] = $generator->key();
$result['second ->current()'] = $generator->current();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'first ->key()': 'my key: first',
                'first ->current()': 'my first value',
                'second ->key()': 'my key: second',
                'second ->current()': 'my second value'
            });
        });

        it('should be able to fetch a generated key for a yielded value following a non-integer computed key', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator($myPrefix) {
    yield $myPrefix . ' first' => 'my first value';

    yield 'my second value';
}

$result = [];
$generator = myGenerator('my key:');

$result['first ->key()'] = $generator->key();
$result['first ->current()'] = $generator->current();
$generator->next();
$result['second ->key()'] = $generator->key();
$result['second ->current()'] = $generator->current();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'first ->key()': 'my key: first',
                'first ->current()': 'my first value',
                'second ->key()': 0, // Previous key cannot be incremented sensibly.
                'second ->current()': 'my second value'
            });
        });

        it('should be able to fetch a generated key for a yielded value following a non-integer computed key when there are previous integer keys', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator($myPrefix) {
    yield 'my first value'; // Generates an integer key.
    yield 'my second value'; // Generates another integer key.

    // Specifies a computed key.
    yield $myPrefix . ' third' => 'my third value';

    yield 'my fourth value'; // Generates a further integer key, while 0 and 1 are already taken.
}

$result = [];
$generator = myGenerator('my key:');

$result['first ->key()'] = $generator->key();
$result['first ->current()'] = $generator->current();
$generator->next();
$result['second ->key()'] = $generator->key();
$result['second ->current()'] = $generator->current();
$generator->next();
$result['third ->key()'] = $generator->key();
$result['third ->current()'] = $generator->current();
$generator->next();
$result['fourth ->key()'] = $generator->key();
$result['fourth ->current()'] = $generator->current();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'first ->key()': 0,
                'first ->current()': 'my first value',
                'second ->key()': 1,
                'second ->current()': 'my second value',
                'third ->key()': 'my key: third',
                'third ->current()': 'my third value',
                // Previous key cannot be incremented sensibly,
                // so continues from the last integer key.
                'fourth ->key()': 2,
                'fourth ->current()': 'my fourth value'
            });
        });

        it('should be able to fetch a generated key for a yielded value following a non-integer computed key when there are previous computed integer keys', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator($myPrefix) {
    yield 'my first value'; // Generates an integer key.
    yield 21 => 'my second value'; // Specifies a computed integer key.

    // Specifies a computed key.
    yield $myPrefix . ' third' => 'my third value';

    yield 'my fourth value'; // Generates a further integer key, while 0 and 1 are already taken.
}

$result = [];
$generator = myGenerator('my key:');

$result['first ->key()'] = $generator->key();
$result['first ->current()'] = $generator->current();
$generator->next();
$result['second ->key()'] = $generator->key();
$result['second ->current()'] = $generator->current();
$generator->next();
$result['third ->key()'] = $generator->key();
$result['third ->current()'] = $generator->current();
$generator->next();
$result['fourth ->key()'] = $generator->key();
$result['fourth ->current()'] = $generator->current();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'first ->key()': 0,
                'first ->current()': 'my first value',
                'second ->key()': 21,
                'second ->current()': 'my second value',
                'third ->key()': 'my key: third',
                'third ->current()': 'my third value',
                // Previous key cannot be incremented sensibly,
                // so continues from the last integer key.
                'fourth ->key()': 22,
                'fourth ->current()': 'my fourth value'
            });
        });
    });

    describe('->next()', function () {
        it('should be able to define and fetch two yielded values from a generator with ->current() and ->next()', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    yield 'my first value';

    yield 'my second value';
}

$result = [];
$generator = myGenerator();

$result['first ->current()'] = $generator->current();
$generator->next();
$result['second ->current()'] = $generator->current();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'first ->current()': 'my first value',
                'second ->current()': 'my second value'
            });
        });
    });

    describe('->rewind()', function () {
        it('should execute a generator up to its first yield statement', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    global $result;
    $result['inside generator, before yield'] = true;

    yield 'my value';
}

$result = [];
$generator = myGenerator();

$generator->rewind();

$result['after ->rewind()'] = true;

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'inside generator, before yield': true,
                'after ->rewind()': true
            });
        });
    });

    describe('->send()', function () {
        it('should resume a generator with the given value and return its next yield', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    $sentValue = yield 'my first value';

    yield 'my second value after: ' . $sentValue;
}

$result = [];
$generator = myGenerator();

$result['first value ->current()'] = $generator->current();
$result['->send()'] = $generator->send('my sent value');
$result['second value ->current()'] = $generator->current();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'first value ->current()': 'my first value',
                '->send()': 'my second value after: my sent value',
                'second value ->current()': 'my second value after: my sent value'
            });
        });
    });

    describe('->throw()', function () {
        it('should resume a generator by throwing the given Throwable into it', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception {}

function myGenerator() {
    global $result;

    $result['log'][] = 'myGenerator first';
    $sentValue = yield 'my first value';
    $result['log'][] = 'myGenerator second';

    try {
        $result['log'][] = 'myGenerator third';
        yield 'my second value after: ' . $sentValue;
        $result['log'][] = 'myGenerator fourth';
    } catch (NotMyException $ex) {
        $result['log'][] = 'myGenerator fifth';
    } catch (MyException $ex) {
        $result['log'][] = 'myGenerator sixth, caught: ' . $ex->getMessage();
    } finally {
        $result['log'][] = 'myGenerator seventh';
    }

    $result['log'][] = 'myGenerator eighth';
    yield 'my third value';
    $result['log'][] = 'myGenerator ninth';

    $result['log'][] = 'myGenerator tenth';
}

$result = ['log' => []];
$generator = myGenerator();
$result['log'][] = 'main first';

$result['first value ->current()'] = $generator->current();
$result['log'][] = 'main second';
$result['->send()'] = $generator->send('my sent value');
$result['second value ->current()'] = $generator->current();
$result['log'][] = 'main third';
$result['->throw()'] = $generator->throw(new MyException('Bang!'));
$result['log'][] = 'main fourth';
$result['third value ->current()'] = $generator->current();
$result['log'][] = 'main fifth';

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'log': [
                    'main first',
                    'myGenerator first',
                    'main second',
                    'myGenerator second',
                    'myGenerator third',
                    'main third',
                    'myGenerator sixth, caught: Bang!',
                    'myGenerator seventh',
                    'myGenerator eighth',
                    'main fourth',
                    'main fifth'
                ],
                'first value ->current()': 'my first value',
                '->send()': 'my second value after: my sent value',
                'second value ->current()': 'my second value after: my sent value',
                '->throw()': 'my third value',
                'third value ->current()': 'my third value'
            });
        });

        it('should start a generator if it has not been already before throwing', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception {}

function myGenerator() {
    global $result;

    $result['log'][] = 'myGenerator first';
    yield 'my value';
    $result['log'][] = 'myGenerator second';
}

$result = ['log' => []];
$generator = myGenerator();

$result['log'][] = 'main first';

try {
    $result['log'][] = 'main second';
    // Note that this assignment will not actually complete, as the exception will be rethrown from here.
    $result['->throw()'] = $generator->throw(new MyException('Bang!'));
    $result['log'][] = 'main third';
} catch (NotMyException $ex) {
    $result['log'][] = 'main fourth';
} catch (MyException $ex) {
    $result['log'][] = 'main fifth, caught: ' . $ex->getMessage();
} finally {
    $result['log'][] = 'main sixth';
}

$result['log'][] = 'main seventh';

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'log': [
                    'main first',
                    'main second',
                    'myGenerator first',
                    'main fifth, caught: Bang!',
                    'main sixth',
                    'main seventh'
                ]
            });
        });

        it('should override a Throwable thrown from inside the generator', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception {}

function myGenerator() {
    global $result;

    $result['log'][] = 'myGenerator first';
    throw new MyException('Bang from inside generator!');
    $result['log'][] = 'myGenerator second';

    yield 'my value that will never be yielded';
    $result['log'][] = 'myGenerator third';
}

$result = ['log' => []];
$generator = myGenerator();

$result['log'][] = 'main first';

try {
    $result['log'][] = 'main second';
    // Note that this assignment will not actually complete, as the exception will be rethrown from here.
    $result['->throw()'] = $generator->throw(new MyException('Bang!'));
    $result['log'][] = 'main third';
} catch (NotMyException $ex) {
    $result['log'][] = 'main fourth';
} catch (MyException $ex) {
    $result['log'][] = 'main fifth, caught: ' . $ex->getMessage();
} finally {
    $result['log'][] = 'main sixth';
}

$result['log'][] = 'main seventh';

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'log': [
                    'main first',
                    'main second',
                    'myGenerator first',
                    'main fifth, caught: Bang!',
                    'main sixth',
                    'main seventh'
                ]
            });
        });
    });

    describe('->valid()', function () {
        it('should return true when the generator has not yet completed', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    yield 'my first value';
    yield 'my second value';
    yield 'my third value';

    return 'my final value';
}

$result = [];
$generator = myGenerator();

$result['first ->valid() before first ->current()'] = $generator->valid();
$result['first value ->current()'] = $generator->current();
$result['first ->valid() after first ->current()'] = $generator->valid();
$generator->next();
$result['second ->valid()'] = $generator->valid();
$result['second value ->current()'] = $generator->current();
$generator->next();
$result['third ->valid()'] = $generator->valid();
$result['third value ->current()'] = $generator->current();
$generator->next();
$result['final ->valid()'] = $generator->valid();
$result['final value ->getReturn()'] = $generator->getReturn();

return $result;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal({
                'first ->valid() before first ->current()': true,
                'first value ->current()': 'my first value',
                'first ->valid() after first ->current()': true,
                'second ->valid()': true,
                'second value ->current()': 'my second value',
                'third ->valid()': true,
                'third value ->current()': 'my third value',
                'final ->valid()': false, // Generator has finished.
                'final value ->getReturn()': 'my final value'
            });
        });
    });

    it('should be able to define and iterate over a simple generator that yields only values', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    yield 'first value';

    yield 'second value';
}

$result = [];

foreach (myGenerator() as $index => $value) {
    $result['value #' . $index] = $value;
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'value #0': 'first value',
            'value #1': 'second value'
        });
    });

    it('should be able to define and use a generator with async pauses that conditionally yields only values', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    $myFirstInput = yield get_async('first value');

    // NB: This could be done with a single yield statement,
    //     but we are testing wrapping the yield statements in control structures.
    if ($myFirstInput === get_async('my sent value')) {
        yield get_async('second value');
    } else {
        yield get_async('third value');
    }
}

$result = [];
$firstGenerator = myGenerator();

$result['first generator, first value ->key()'] = $firstGenerator->key();
$result['first generator, first value ->current()'] = $firstGenerator->current();
$result['first generator ->send()'] = $firstGenerator->send('my sent value');
$result['first generator, second value ->key()'] = $firstGenerator->key();
$result['first generator, second value ->current()'] = $firstGenerator->current();

$secondGenerator = myGenerator();

$result['second generator, first value ->key()'] = $secondGenerator->key();
$result['second generator, first value ->current()'] = $secondGenerator->current();
$result['second generator ->send()'] = $secondGenerator->send('your sent value');
$result['second generator, second value ->key()'] = $secondGenerator->key();
$result['second generator, second value ->current()'] = $secondGenerator->current();

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createAsyncPresentValue(value);
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'first generator, first value ->key()': 0,
            'first generator, first value ->current()': 'first value',
            'first generator ->send()': 'second value',
            'first generator, second value ->key()': 1,
            'first generator, second value ->current()': 'second value',

            'second generator, first value ->key()': 0,
            'second generator, first value ->current()': 'first value',
            'second generator ->send()': 'third value',
            'second generator, second value ->key()': 1,
            'second generator, second value ->current()': 'third value'
        });
    });

    it('should correctly handle generators that throw before yielding anything', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception {}

function myGenerator() {
    global $result;

    $result['log'][] = 'myGenerator first';
    throw new MyException('Bang from inside generator!');
    $result['log'][] = 'myGenerator second';

    yield 'my value that will never be yielded';
    $result['log'][] = 'myGenerator third';
}

$result = ['log' => []];
$generator = myGenerator();

$result['log'][] = 'main first';

try {
    $result['log'][] = 'main second';
    // Note that this assignment will not actually complete, as the exception will be rethrown from here.
    $result['->current()'] = $generator->current();
    $result['log'][] = 'main third';
} catch (NotMyException $ex) {
    $result['log'][] = 'main fourth';
} catch (MyException $ex) {
    $result['log'][] = 'main fifth, caught: ' . $ex->getMessage();
} finally {
    $result['log'][] = 'main sixth';
}

$result['log'][] = 'main seventh';

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'log': [
                'main first',
                'main second',
                'myGenerator first',
                'main fifth, caught: Bang from inside generator!',
                'main sixth',
                'main seventh'
            ]
        });
    });

    it('should correctly handle a generator with loop', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    global $result;

    $result['log'][] = 'myGenerator first';

    for ($i = 0; $i < 4; $i++) {
        $result['log'][] = 'myGenerator loop #' . $i;

        yield 'myGenerator loop yield #' . $i;
    }

    $result['log'][] = 'myGenerator second';
}

$result = ['log' => []];
$generator = myGenerator();

$result['log'][] = 'main first';

foreach ($generator as $value) {
    $result['log'][] = 'from generator: ' . $value;
}

$result['log'][] = 'main second';

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'log': [
                'main first',
                'myGenerator first',
                'myGenerator loop #0',
                'from generator: myGenerator loop yield #0',
                'myGenerator loop #1',
                'from generator: myGenerator loop yield #1',
                'myGenerator loop #2',
                'from generator: myGenerator loop yield #2',
                'myGenerator loop #3',
                'from generator: myGenerator loop yield #3',
                'myGenerator second',
                'main second'
            ]
        });
    });

    it('should correctly handle a generator invoking another', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myFirstGenerator() {
    global $result;

    $result['log'][] = 'myFirstGenerator first';

    for ($i = 0; $i < 4; $i++) {
        $result['log'][] = 'myFirstGenerator loop #' . $i;

        yield 'myFirstGenerator loop yield #' . $i;

        if ($i === 2) {
            foreach (mySecondGenerator() as $value) {
                yield 'from inner generator during iteration #2: ' . $value;
            }
        }
    }

    $result['log'][] = 'myFirstGenerator second';
}

function mySecondGenerator() {
    global $result;

    $result['log'][] = 'mySecondGenerator first';
    yield 'my first value of second generator';

    $result['log'][] = 'mySecondGenerator second';
    yield 'my second value of second generator';

    $result['log'][] = 'mySecondGenerator third';
}

$result = ['log' => []];
$generator = myFirstGenerator();

$result['log'][] = 'main first';

foreach ($generator as $value) {
    $result['log'][] = 'from generator: ' . $value;
}

$result['log'][] = 'main second';

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'log': [
                'main first',
                'myFirstGenerator first',
                'myFirstGenerator loop #0',
                'from generator: myFirstGenerator loop yield #0',
                'myFirstGenerator loop #1',
                'from generator: myFirstGenerator loop yield #1',
                'myFirstGenerator loop #2',
                'from generator: myFirstGenerator loop yield #2',

                'mySecondGenerator first',
                'from generator: from inner generator during iteration #2: my first value of second generator',
                'mySecondGenerator second',
                'from generator: from inner generator during iteration #2: my second value of second generator',
                'mySecondGenerator third',

                'myFirstGenerator loop #3',
                'from generator: myFirstGenerator loop yield #3',
                'myFirstGenerator second',
                'main second'
            ]
        });
    });
});
