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
    tools = require('../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP "try" statement integration', function () {
    it('should allow a thrown exception created inline to be caught', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

class MyException extends Exception {}

try {
    $result[] = 1;
    throw new MyException('Oh no');
    $result[] = 2;
} catch (NotMyException $ex2) {
    $result[] = 3;
} catch (MyException $ex1) {
    $result[] = 4;
} finally {
    $result[] = 5;
}
$result[] = 6;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([1, 4, 5, 6]);
    });

    it('should support a global-namespace-relative class path', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

class MyException extends Exception {}

try {
    $result[] = 1;
    throw new MyException('Oh no');
    $result[] = 2;
} catch (NotMyException $ex2) {
    $result[] = 3;
} catch (\MyException $ex1) {
    $result[] = 4;
} finally {
    $result[] = 5;
}
$result[] = 6;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([1, 4, 5, 6]);
    });

    it('should support a namespace-relative class path', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\Stuff {
    class MyException extends \Exception {}
}

namespace {
    use My\Stuff\MyException as MyImportedException;

    $result = [];

    try {
        $result[] = 1;
        throw new MyImportedException('Oh no');
        $result[] = 2;
    } catch (NotMyException $ex2) {
        $result[] = 3;
    } catch (MyImportedException $ex1) {
        $result[] = 4;
    } finally {
        $result[] = 5;
    }
    $result[] = 6;

    return $result;
}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([1, 4, 5, 6]);
    });

    it('should allow a thrown exception stored in variable to be caught', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

class MyException extends Exception {}

try {
    $result[] = 1;
    $myException = new MyException('Oh no');
    throw $myException;
    $result[] = 2;
} catch (NotMyException $ex2) {
    $result[] = 3;
} catch (MyException $ex1) {
    $result[] = 4;
} finally {
    $result[] = 5;
}
$result[] = 6;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([1, 4, 5, 6]);
    });

    it('should rethrow a Throwable after the finally clause if there is no matching catch', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

try {
    throw new Exception('Bang!');
} catch (SomeOtherExceptionClass $ex) {
    print '[I should not be reached]';
} finally {
    print '[In finally]';
}

print '[I should not be reached either]';
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Exception: Bang! in /path/to/module.php on line 4'
        );
        expect(engine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
[In finally]
Fatal error: Uncaught Exception: Bang! in /path/to/module.php:4
Stack trace:
#0 {main}
  thrown in /path/to/module.php on line 4

EOS
            */;}) //jshint ignore:line
        );
    });

    it('should allow a finally clause to convert the thrown Throwable into a return, discarding it', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

try {
    throw new Exception('Bang!');
} catch (SomeOtherExceptionClass $ex) {
    print '[I should not be reached]';
} finally {
    print '[In finally]';

    return 'Done!';
}

print '[I should not be reached either]';
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal('Done!');
        expect(engine.getStdout().readAll()).to.equal('[In finally]');
    });

    it('should support pause/resume where all pauses resume', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

class MyException extends Exception {}

$result[] = get_async('first');

try {
    $result[] = get_async('second');
    throw new MyException('Oh no');
    $result[] = get_async('third');
} catch (NotMyException $ex2) {
    $result[] = get_async('fourth');
} catch (MyException $ex1) {
    $result[] = get_async('fifth');
} finally {
    $result[] = get_async('sixth');
}
$result[] = get_async('seventh');

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createAsyncPresentValue(value);
        });

        expect((await engine.execute()).getNative()).to.deep.equal([
            'first',
            'second',
            'fifth',
            'sixth',
            'seventh'
        ]);
    });

    it('should support a try clause with a return of function call that throws a caught exception', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

class MyException extends Exception {}

function my_userland_func()
{
    global $result;

    $result[] = get_async('first');
    throw new MyException(get_async('Bang!'));
    $result[] = get_async('second');
}

$result[] = get_async('third');

try {
    $result[] = get_async('fourth');
    return my_userland_func();
    $result[] = get_async('fifth');
} catch (NotMyException $ex2) {
    $result[] = get_async('sixth');
} catch (MyException $ex1) {
    $result[] = get_async('seventh');

    // Add a control structure to test that when calculation opcode results are cleared,
    // the return opcode's throw-result is kept to preserve control flow.
    if (get_async('my string') === 'my string') {
        $result[] = get_async('eighth');
    }

    $result[] = get_async('ninth');
} finally {
    $result[] = get_async('tenth');
}
$result[] = get_async('eleventh');

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createAsyncPresentValue(value);
        });

        expect((await engine.execute()).getNative()).to.deep.equal([
            'third',
            'fourth',
            'first',
            'seventh',
            'eighth',
            'ninth',
            'tenth',
            'eleventh'
        ]);
    });

    it('should preserve the return value if there is a finally that does not override it', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

try {
    $result[] = 1;
    return 'my result';
    $result[] = 2;
} catch (NotMyException $ex) {
    $result[] = 3;
} finally {
    $result[] = 4;

    if (get_async(true) === true) {
        $result[] = 5;
    }

    $result[] = 6;
}
$result[] = 7;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createAsyncPresentValue(value);
        });

        expect((await engine.execute()).getNative()).to.equal('my result');
        expect(engine.getGlobal('result').getNative()).to.deep.equal([1, 4, 5, 6]);
    });

    it('should support pause/resume where one pause throws-into', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

class MyException extends Exception {}

$result[] = get_async('first');

try {
    $result[] = get_async('second');
    throw new MyException('Oh no');
    $result[] = get_async('third');
} catch (NotMyException $ex2) {
    $result[] = get_async('fourth');
} catch (MyException $ex1) {
    try {
        // This should resume with a throwInto<Exception>(), see JS implementation of get_async() below.
        $result[] = get_async('fifth');
    } catch (Throwable $t) {
        $result[] = 'caught: ' .
            $t->getMessage() .
            ' @ ' .
            $t->getFile() .
            ':' .
            $t->getLine();
    }
} finally {
    $result[] = get_async('sixth');
}
$result[] = get_async('seventh');

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            var internals = this;

            return internals.createFutureValue(function (resolve, reject) {
                setImmediate(function () {
                    if (value === 'fifth') {
                        // Throw-into with a PHP Exception instance, so it can be caught by PHP-land.
                        reject(internals.valueFactory.createErrorObject(
                            'Exception',
                            'Bang!',
                            null,
                            null,
                            '/some/fault.php',
                            1234
                        ));
                    } else {
                        resolve(value);
                    }
                });
            });
        });

        expect((await engine.execute()).getNative()).to.deep.equal([
            'first',
            'second',
            // See the nested try...catch and the get_async() JS implementation above.
            'caught: Bang! @ /some/fault.php:1234',
            'sixth',
            'seventh'
        ]);
    });
});
