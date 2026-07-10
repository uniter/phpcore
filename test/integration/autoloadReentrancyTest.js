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
    path = require('path'),
    phpTest = require('phptest'),
    // NB: forceOpcodesAsync is disabled here, unlike ./tools.js's shared instance.
    //     Forcing every single opcode to pause turns this same bug into an infinite
    //     loop instead of the clean, deterministic corruption this test wants to pin
    //     down, so a real async pause (the autoload below) is relied on instead.
    tools = phpTest.createIntegrationTools(path.join(__dirname, '..', '..'), undefined, false);

describe('PHP autoload reentrancy integration', function () {
    it('should correctly resume a call paused several frames deep during autoload, ' +
        'even once an unrelated call has run to completion in the meantime', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
spl_autoload_register(function ($class) {
    require $class . '.php';
});

return [
    'first' => function () {
        // Referencing MyClass for the first time here pauses several call frames deep:
        // this closure -> class resolution/autoload dispatch -> the autoloader
        // callback's own `require`.
        $object = new MyClass();

        return 'first:' . $object->getIt();
    },
    'second' => function () {
        // Entirely unrelated - no shared class, no autoloading, nothing that should
        // be able to affect "first" at all.
        return 'second result';
    }
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({
                include: function (path, promise) {
                    // Resolve synchronously - the autoloaded file is already available
                    // (as it always is for a bundled/precompiled module in production),
                    // it is only the wrapping Future that settles a tick later.
                    promise.resolve(tools.asyncTranspile(path, nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function getIt()
    {
        return 22;
    }
}
EOS
*/;}))); //jshint ignore:line
                }
            }),
            engine = module({}, environment),
            exportedClosures,
            firstPromise,
            secondPromise;

        exportedClosures = (await engine.execute()).getNative();

        // Call "first", which pauses partway through resolving/autoloading MyClass.
        firstPromise = exportedClosures.first();
        // Call "second" while "first" is still paused - unrelated, and lets it run
        // to completion before "first"'s pause is resolved.
        secondPromise = exportedClosures.second();

        expect(await secondPromise).to.equal('second result');
        expect(await firstPromise).to.equal('first:22');
    });

    it('should correctly resume an unrelated paused call after a sibling call\'s autoload fails, ' +
        'even when its own class was still being defined at that point', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
spl_autoload_register(function ($class) {
    require $class . '.php';
});

return [
    'first' => function () {
        // BadClass.php throws during autoload, several call frames deep, exactly as
        // in the test above - but this time the autoload fails rather than succeeding.
        $object = new BadClass();

        return 'first:' . $object->getIt();
    },
    'second' => function () {
        // Unrelated - a different class, but one that also pauses partway through its
        // own autoload, so it is still mid-flight (with its own calls still pushed)
        // at the exact point "first"'s failed autoload is unwound.
        $object = new GoodClass();

        return 'second:' . $object->getIt();
    }
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({
                include: function (path, promise) {
                    if (path.indexOf('BadClass') !== -1) {
                        promise.resolve(tools.asyncTranspile(path, nowdoc(function () {/*<<<EOS
<?php
throw new Exception('Failed to load BadClass');
EOS
*/;}))); //jshint ignore:line
                        return;
                    }

                    promise.resolve(tools.asyncTranspile(path, nowdoc(function () {/*<<<EOS
<?php
class GoodClass
{
    public function getIt()
    {
        return 22;
    }
}
EOS
*/;}))); //jshint ignore:line
                }
            }),
            engine = module({}, environment),
            exportedClosures,
            firstPromise,
            secondPromise;

        exportedClosures = (await engine.execute()).getNative();

        // Call "first", which pauses partway through resolving/autoloading BadClass,
        // whose autoload will go on to fail.
        firstPromise = exportedClosures.first();
        // Call "second" while "first" is still paused - unrelated, but also pauses
        // partway through its own (successful) autoload of GoodClass.
        secondPromise = exportedClosures.second();

        await expect(firstPromise).to.be.rejectedWith(
            'PHP Fatal error: Uncaught Exception: Failed to load BadClass in BadClass.php on line 2'
        );
        expect(await secondPromise).to.equal('second:22');
    });
});
