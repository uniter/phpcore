/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

/*jshint latedef:false */
'use strict';

var expect = require('chai').expect,
    nowdoc = require('nowdoc'),
    tools = require('./tools');

describe('PHP asynchronous tick integration', function () {
    it('should allow the registered tick handler called before every PHP statement to pause', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = log_and_return(21);
$myVar = log_and_return(101);
$result[] = log_and_return($myVar);

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php, {
                phpToAST: {
                    captureAllBounds: true
                },
                phpToJS: {
                    tick: true
                }
            }),
            log = [],
            options = {
                path: 'my/script/testing/async/ticks.php',
                // Define a tick handler that logs the details of the statement and then pauses
                tick: function (path, startLine, startColumn, endLine, endColumn) {
                    var pause;

                    log.push('tick() :: ' + path + '@' + startLine + ':' + startColumn + '-' + endLine + ':' + endColumn);

                    // Pause after each tick and later resume
                    pause = engine.createPause();

                    setTimeout(function () {
                        log.push('resuming...');
                        pause.resume();
                    }, 1);

                    log.push('pausing...');
                    pause.now();
                }
            },
            engine = module(options);

        engine.defineCoercingFunction('log_and_return', function (value) {
            log.push('log_and_return() :: ' + value);

            return value;
        });

        return engine.execute().then(function (result) {
            expect(result.getNative()).to.deep.equal([
                21,
                101
            ]);
            expect(log).to.deep.equal([
                'tick() :: my/script/testing/async/ticks.php@3:1-3:14',
                'pausing...', // Check for the pause & resume behaviour
                'resuming...',
                'tick() :: my/script/testing/async/ticks.php@5:1-5:32',
                'pausing...',
                'resuming...',
                'log_and_return() :: 21',
                'tick() :: my/script/testing/async/ticks.php@6:1-6:30',
                'pausing...',
                'resuming...',
                'log_and_return() :: 101',
                'tick() :: my/script/testing/async/ticks.php@7:1-7:36',
                'pausing...',
                'resuming...',
                'log_and_return() :: 101',
                'tick() :: my/script/testing/async/ticks.php@9:1-9:16',
                'pausing...',
                'resuming...'
            ]);
        });
    });
});
