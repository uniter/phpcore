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

describe('PHP callable array element "[...]" integration', function () {
    it('call to callable stored as array element', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myClosure = function ($number) {
    return $number * 2;
};

$myArray = ['someKey' => $myClosure];
$myKey = 'someKey';

$result = [];
$result[] = $myArray[$myKey](21);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            42
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should raise a fatal error when attempting to call an empty array', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$invalidCallableArray = [];
$invalidCallableArray(123);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Function name must be a string in /path/to/module.php on line 3'
        );
    });
});
