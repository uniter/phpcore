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
    tools = require('./tools');

describe('PHP reentrancy integration', function () {
    it('should support re-executing a module during a pause', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

do_pause_if_needed();

function getTrace() {
    return (new Exception)->getTraceAsString();
}

return [
    'trace' => getTrace()
];
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            paused = false;
        engine.defineCoercingFunction('do_pause_if_needed', function () {
            if (paused) {
                return;
            }

            paused = true;

            return this.createFutureValue(function () {
                // Leave the future unresolved so the engine will be paused...
            });
        });
        // Perform the initial execution, which will pause indefinitely. Whilst paused...
        engine.execute();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'trace': nowdoc(function () {/*<<<EOS
#0 /path/to/my_module.php(10): getTrace()
#1 /path/to/my_module.php(3): ()
#2 /path/to/my_module.php(3): do_pause_if_needed()
#3 {main}
EOS
*/;}), //jshint ignore:line
        });
    });

    it('should support calling into an exported closure while one is paused', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$firstClosure = function () {
    do_pause();
};

$secondClosure = function () {
    return 'my result';
};

return [
    'first' => $firstClosure,
    'second' => $secondClosure
];
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            exportedClosures;
        engine.defineCoercingFunction('do_pause', function () {
            return this.createFutureValue(function () {
                // Leave the future unresolved so the engine will be paused...
            });
        });
        exportedClosures = (await engine.execute()).getNative();
        // Call the first closure, which will pause indefinitely. Whilst paused...
        exportedClosures.first();

        // Call the second closure
        expect(await exportedClosures.second()).to.equal('my result');
    });
});
