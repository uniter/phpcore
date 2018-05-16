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

describe('PHP synchronous tick integration', function () {
    it('should call the registered tick handler after every PHP statement', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = log_and_return(21);
$myVar = log_and_return(101);
$result[] = log_and_return($myVar);

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php, {
                phpToAST: {
                    captureAllBounds: true
                },
                phpToJS: {
                    tick: true
                }
            }),
            log = [],
            options = {
                path: 'my/caller.php',
                // Define a very simple tick handler, that just logs the details of the statement
                tick: function (path, startLine, startColumn, endLine, endColumn) {
                    log.push('tick() :: ' + path + '@' + startLine + ':' + startColumn + '-' + endLine + ':' + endColumn);
                }
            },
            engine = module(options);

        engine.defineCoercingFunction('log_and_return', function (value) {
            log.push('log_and_return() :: ' + value);

            return value;
        });

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            101
        ]);
        expect(log).to.deep.equal([
            'tick() :: my/caller.php@3:1-3:14',
            'tick() :: my/caller.php@5:1-5:32',
            'log_and_return() :: 21',
            'tick() :: my/caller.php@6:1-6:30',
            'log_and_return() :: 101',
            'tick() :: my/caller.php@7:1-7:36',
            'log_and_return() :: 101',
            'tick() :: my/caller.php@9:1-9:16'
        ]);
    });
});
