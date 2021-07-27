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
    it('should allow a thrown exception to be caught', function () {
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
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([1, 4, 5, 6]);
    });

    it('should rethrow a Throwable after the finally clause if there is no matching catch', function () {
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
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
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

    it('should allow a finally clause to convert the thrown Throwable into a return, discarding it', function () {
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
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.equal('Done!');
        expect(engine.getStdout().readAll()).to.equal('[In finally]');
    });

    it('should support pause/resume where all pauses resume', function () {
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
            module = tools.asyncTranspile(null, php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(value);
                });
            });
        });

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal([
                'first',
                'second',
                'fifth',
                'sixth',
                'seventh'
            ]);
        });
    });

    it('should support pause/resume where one pause throws-into', function () {
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
        // This should resume with a throwInto<Exception>(), see JS implementation of get_async() below
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
            module = tools.asyncTranspile(null, php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            var internals = this;

            return internals.createFutureValue(function (resolve, reject) {
                setImmediate(function () {
                    if (value === 'fifth') {
                        // Throw-into with a PHP Exception instance, so it can be caught by PHP-land
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

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal([
                'first',
                'second',
                // See the nested try..catch and the get_async() JS implementation above
                'caught: Bang! @ /some/fault.php:1234',
                'sixth',
                'seventh'
            ]);
        });
    });
});
