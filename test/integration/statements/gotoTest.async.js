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

describe('PHP "goto" statement integration (async mode)', function () {
    it('should be able to jump forward out of while loop with pauses', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
    echo get_async('first');
    $i = 0;

    while (get_async($i) < 10) {
        echo get_async('second');
        $i++;

        echo 'third';
        if ($i === get_async(2)) {
            echo get_async('fourth');
            goto done;
            echo 'fifth';
        }
        echo get_async('sixth');
    }
    echo 'seventh';

done:
    echo get_async('eighth');
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
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

        await engine.execute();

        expect(engine.getStdout().readAll()).to.equal('firstsecondthirdsixthsecondthirdfourtheighth');
    });
});
