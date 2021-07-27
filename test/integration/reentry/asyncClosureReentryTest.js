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

describe.skip('PHP async closure reentry integration', function () {
    it('should allow an exported closure to be called during a pause', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return [
    'firstClosure' => function ($arg) {
        return get_never($arg . ' -> first closure');
    },
    'secondClosure' => function ($arg) {
        raiseAnError();
    }
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module(),
            reentryToken;
        engine.defineFunction('get_never', function (internals) {
            return function () {
                // Create a re-entry token to allow secondClosure to interrupt the pause
                reentryToken = internals.createReentryToken('My test');

                return internals.createFutureValue(function () {
                    // Never resolve or reject the future
                });
            };
        });

        return engine.execute().then(function (resultValue) {
            var exported = resultValue.getNative();

            // Call the first closure, which will pause, but never be resolved or rejected
            exported.firstClosure('one');

            return reentryToken.reenter(function () {
                return expect(exported.secondClosure('two').finally(function () {
                    expect(engine.getStderr().readAll()).to.equal(
                        '...'
                    );
                    // NB: Stdout should have a leading newline written out just before the message
                    expect(engine.getStdout().readAll()).to.equal(
                        '\n...'
                    );
                })).to.be.rejectedWith(
                    PHPFatalError,
                    '...'
                );
            });
        });
    });
});
