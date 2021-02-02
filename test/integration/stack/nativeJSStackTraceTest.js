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

describe('PHP native JS stack trace integration', function () {
    it('should be able to remove PHPCore stack frames for a JS-originated error in callout from PHP-land functions', function () {
        var caughtError = null,
            php = nowdoc(function () {/*<<<EOS
<?php

function mySecondPHPFunc($extraMessage) {
    myErroringJSFunc($extraMessage);
}

function myFirstPHPFunc($extraMessage) {
    mySecondPHPFunc($extraMessage);
}

myFirstPHPFunc('What will we do?');

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php, {
                sourceMap: true,
                phpToJS: {stackCleaning: true}
            }),
            engine = module({stackCleaning: true});

        engine.defineCoercingFunction('myErroringJSFunc', function myErroringJSFunc(extraMessage) {
            throw new Error('Oh dear! ' + extraMessage);
        });

        try {
            engine.execute();
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).not.to.be.null;
        expect(caughtError.message).to.equal('Oh dear! What will we do?');
        /*
         * Check that the PHPCore-internal frames are removed. Keep test's line & column numbers intact
         * as those should be less likely to change (as they relate to this specific module only)
         * and we have more confidence that line/column numbers are not corrupted by stack cleaning
         */
        return tools.normaliseStack(caughtError.stack, module).then(function (normalisedStack) {
            expect(normalisedStack).to.equal(
                nowdoc(function () {/*<<<EOS
Error: Oh dear! What will we do?
    at FunctionInternals.myErroringJSFunc (/path/to/phpcore/test/integration/stack/nativeJSStackTraceTest.js:41:19)
    at Scope._mySecondPHPFunc (/path/to/my_module.php:4:4)
    at Scope._myFirstPHPFunc (/path/to/my_module.php:8:4)
    at __uniter_php_module__ (/path/to/my_module.php:11:0)
    at Context.<anonymous> (/path/to/phpcore/test/integration/stack/nativeJSStackTraceTest.js:45:20)
    at callFn (/path/to/mocha/lib/runnable.js:??:??)
    at Test.Runnable.run (/path/to/mocha/lib/runnable.js:??:??)
    at Runner.runTest (/path/to/mocha/lib/runner.js:??:??)
    at /path/to/mocha/lib/runner.js:??:??
    at next (/path/to/mocha/lib/runner.js:??:??)
    at /path/to/mocha/lib/runner.js:??:??
    at next (/path/to/mocha/lib/runner.js:??:??)
    at Immediate._onImmediate (/path/to/mocha/lib/runner.js:??:??)
    at processImmediate (/path/to/internal/timers:??:??)
EOS
*/;}) //jshint ignore:line
            );
        });
    });

    it('should be able to remove PHPCore stack frames for a JS-originated error in callout from PHP-land static and instance methods', function () {
        var caughtError = null,
            php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public static function myStaticMethod($extraMessage)
    {
        return myErroringJSFunc($extraMessage);
    }

    public function myInstanceMethod($extraMessage)
    {
        return static::myStaticMethod($extraMessage);
    }
}

$myObject = new MyClass();
$myObject->myInstanceMethod('What will we do?');

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php, {
                sourceMap: true,
                phpToJS: {stackCleaning: true}
            }),
            engine = module({stackCleaning: true});

        engine.defineCoercingFunction('myErroringJSFunc', function myErroringJSFunc(extraMessage) {
            throw new Error('Oh dear! ' + extraMessage);
        });

        try {
            engine.execute();
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).not.to.be.null;
        expect(caughtError.message).to.equal('Oh dear! What will we do?');
        /*
         * Check that the PHPCore-internal frames are removed. Keep test's line & column numbers intact
         * as those should be less likely to change (as they relate to this specific module only)
         * and we have more confidence that line/column numbers are not corrupted by stack cleaning
         */
        return tools.normaliseStack(caughtError.stack, module).then(function (normalisedStack) {
            expect(normalisedStack).to.equal(
                nowdoc(function () {/*<<<EOS
Error: Oh dear! What will we do?
    at FunctionInternals.myErroringJSFunc (/path/to/phpcore/test/integration/stack/nativeJSStackTraceTest.js:111:19)
    at Scope._myStaticMethod (/path/to/my_module.php:7:15)
    at Scope._myInstanceMethod (/path/to/my_module.php:12:15)
    at __uniter_php_module__ (/path/to/my_module.php:17:0)
    at Context.<anonymous> (/path/to/phpcore/test/integration/stack/nativeJSStackTraceTest.js:115:20)
    at callFn (/path/to/mocha/lib/runnable.js:??:??)
    at Test.Runnable.run (/path/to/mocha/lib/runnable.js:??:??)
    at Runner.runTest (/path/to/mocha/lib/runner.js:??:??)
    at /path/to/mocha/lib/runner.js:??:??
    at next (/path/to/mocha/lib/runner.js:??:??)
    at /path/to/mocha/lib/runner.js:??:??
    at next (/path/to/mocha/lib/runner.js:??:??)
    at Immediate._onImmediate (/path/to/mocha/lib/runner.js:??:??)
    at processImmediate (/path/to/internal/timers:??:??)
EOS
*/;}) //jshint ignore:line
            );
        });
    });

    it('should be able to remove PHPCore stack frames for a JS-originated error in call chain from PHP->JS->PHP->JS', function () {
        var caughtError = null,
            php = nowdoc(function () {/*<<<EOS
<?php

function mySecondPHPFunc($extraMessage, $shouldThrow) {
    if ($shouldThrow) {
        myErroringJSFunc($extraMessage);
    } else {
        myReenteringJSFunc($extraMessage);
    }
}

function myFirstPHPFunc($extraMessage, $shouldThrow) {
    mySecondPHPFunc($extraMessage, $shouldThrow);
}

return function ($extraMessage, $shouldThrow) {
    return myFirstPHPFunc($extraMessage, $shouldThrow);
};

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php, {
                sourceMap: true,
                phpToJS: {stackCleaning: true}
            }),
            engine = module({stackCleaning: true}),
            phpEntryPoint;

        engine.defineCoercingFunction('myErroringJSFunc', function myErroringJSFunc(extraMessage) {
            throw new Error('Oh dear! ' + extraMessage);
        });

        engine.defineCoercingFunction('myReenteringJSFunc', function myReenteringJSFunc(extraMessage) {
            phpEntryPoint(extraMessage, true); // Pass true as we now want to throw
        });

        phpEntryPoint = engine.execute().getNative();

        try {
            phpEntryPoint('What will we do?', false);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).not.to.be.null;
        expect(caughtError.message).to.equal('Oh dear! What will we do?');
        /*
         * Check that the PHPCore-internal frames are removed. Keep test's line & column numbers intact
         * as those should be less likely to change (as they relate to this specific module only)
         * and we have more confidence that line/column numbers are not corrupted by stack cleaning
         */
        return tools.normaliseStack(caughtError.stack, module).then(function (normalisedStack) {
            expect(normalisedStack).to.equal(
                nowdoc(function () {/*<<<EOS
Error: Oh dear! What will we do?
    at FunctionInternals.myErroringJSFunc (/path/to/phpcore/test/integration/stack/nativeJSStackTraceTest.js:182:19)
    at Scope._mySecondPHPFunc (/path/to/my_module.php:5:8)
    at Scope._myFirstPHPFunc (/path/to/my_module.php:12:4)
    at Scope.__uniter_php_closure__ (/path/to/my_module.php:16:11)
    at FunctionInternals.myReenteringJSFunc (/path/to/phpcore/test/integration/stack/nativeJSStackTraceTest.js:186:13)
    at Scope._mySecondPHPFunc (/path/to/my_module.php:7:8)
    at Scope._myFirstPHPFunc (/path/to/my_module.php:12:4)
    at Scope.__uniter_php_closure__ (/path/to/my_module.php:16:11)
    at Context.<anonymous> (/path/to/phpcore/test/integration/stack/nativeJSStackTraceTest.js:192:13)
    at callFn (/path/to/mocha/lib/runnable.js:??:??)
    at Test.Runnable.run (/path/to/mocha/lib/runnable.js:??:??)
    at Runner.runTest (/path/to/mocha/lib/runner.js:??:??)
    at /path/to/mocha/lib/runner.js:??:??
    at next (/path/to/mocha/lib/runner.js:??:??)
    at /path/to/mocha/lib/runner.js:??:??
    at next (/path/to/mocha/lib/runner.js:??:??)
    at Immediate._onImmediate (/path/to/mocha/lib/runner.js:??:??)
    at processImmediate (/path/to/internal/timers:??:??)
EOS
*/;}) //jshint ignore:line
            );
        });
    });

    it('should correctly apply Error.stackTraceLimit to the cleaned stack', function () {
        var caughtError = null,
            php = nowdoc(function () {/*<<<EOS
<?php

function mySecondPHPFunc($extraMessage) {
    myErroringJSFunc($extraMessage);
}

function myFirstPHPFunc($extraMessage) {
    mySecondPHPFunc($extraMessage);
}

myFirstPHPFunc('What will we do?');

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php, {
                sourceMap: true,
                phpToJS: {stackCleaning: true}
            }),
            engine = module({stackCleaning: true});

        engine.defineCoercingFunction('myErroringJSFunc', function myErroringJSFunc(extraMessage) {
            throw new Error('Oh dear! ' + extraMessage);
        });

        // Only capture the most recent 5 frames (_after_ stack cleaning)
        Error.stackTraceLimit = 5;

        try {
            engine.execute();
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).not.to.be.null;
        expect(caughtError.message).to.equal('Oh dear! What will we do?');
        /*
         * Check that the PHPCore-internal frames are removed. Keep test's line & column numbers intact
         * as those should be less likely to change (as they relate to this specific module only)
         * and we have more confidence that line/column numbers are not corrupted by stack cleaning
         */
        return tools.normaliseStack(caughtError.stack, module).then(function (normalisedStack) {
            expect(normalisedStack).to.equal(
                nowdoc(function () {/*<<<EOS
Error: Oh dear! What will we do?
    at FunctionInternals.myErroringJSFunc (/path/to/phpcore/test/integration/stack/nativeJSStackTraceTest.js:256:19)
    at Scope._mySecondPHPFunc (/path/to/my_module.php:4:4)
    at Scope._myFirstPHPFunc (/path/to/my_module.php:8:4)
    at __uniter_php_module__ (/path/to/my_module.php:11:0)
    at Context.<anonymous> (/path/to/phpcore/test/integration/stack/nativeJSStackTraceTest.js:263:20)
EOS
*/;}) //jshint ignore:line
            );
        });
    });
});
