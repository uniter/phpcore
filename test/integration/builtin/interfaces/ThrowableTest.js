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

describe('PHP builtin Throwable interface integration', function () {
    it('should support catching Exceptions and Errors', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

try {
    throwAnError();
} catch (Throwable $throwable) {
    $result[] = get_my_object_class($throwable) .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

try {
    throw new Exception('Oh dear!');
} catch (Throwable $throwable) {
    $result[] = get_my_object_class($throwable) .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

return $result;
EOS
*/;}),//jshint ignore:line,
            module = tools.syncTranspile('/path/to/my/module.php', php),
            engine = module(),
            result;
        engine.defineNonCoercingFunction('get_my_object_class', function (objectValue) {
            return objectValue.getValue().getClassName();
        });

        result = engine.execute();

        expect(result.getNative()).to.deep.equal([
            'Error: Call to undefined function throwAnError() @ /path/to/my/module.php:5',
            'Exception: Oh dear! @ /path/to/my/module.php:17'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly trap a userland class attempting to implement Throwable', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Awesome\Lib;

class MyThrowable implements \ThrowABLe {} // Use different case to test case-insensitivity
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module({
                eval: function (evalPHP, path, promise) {
                    promise.resolve(tools.syncTranspile(path, evalPHP));
                }
            });

        // NB: Unlike other errors, an uncaught compile-time fatal error is displayed as "PHP Fatal error: ..."
        //     as below, _not_ as eg. "PHP Fatal error: Uncaught Error ..."
        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Class My\\Awesome\\Lib\\MyThrowable cannot implement interface Throwable, extend Exception or Error instead in /path/to/my_module.php on line 5'
        );
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Fatal error:  Class My\\Awesome\\Lib\\MyThrowable cannot implement interface Throwable, extend Exception or Error instead in /path/to/my_module.php on line 5\n'
        );
        // NB: Stdout should have a leading newline written out just before the message
        expect(engine.getStdout().readAll()).to.equal(
            '\nFatal error: Class My\\Awesome\\Lib\\MyThrowable cannot implement interface Throwable, extend Exception or Error instead in /path/to/my_module.php on line 5\n'
        );
    });
});
