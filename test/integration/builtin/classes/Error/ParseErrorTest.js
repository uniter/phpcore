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
    tools = require('../../../tools'),
    PHPParseError = phpCommon.PHPParseError;

describe('PHP builtin ParseError class integration', function () {
    // Note that the ParseError is caught and returned to JS-land, rather than
    // the error being allowed to throw from PHP-land up to JS-land.
    it('should correctly export a ParseError to JS-land', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

try {
    eval('notvalid');
} catch (Throwable $throwable) {
    return $throwable;
}
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module({
                eval: function (evalPHP, path, promise) {
                    promise.resolve(tools.syncTranspile(path, evalPHP));
                }
            }),
            resultNativeError,
            resultValue;

        resultValue = await engine.execute();

        expect(resultValue.getType()).to.equal('object');
        expect(resultValue.getInternalValue().getClassName()).to.equal('ParseError');
        resultNativeError = resultValue.getNative();
        // Note that this coercion is defined by a custom unwrapper in src/builtin/classes/Error/ParseError.js.
        expect(resultNativeError).to.be.an.instanceOf(PHPParseError);
        expect(resultNativeError.getFilePath()).to.equal('/path/to/my_module.php(4) : eval()\'d code');
        expect(resultNativeError.getLevel()).to.equal('Parse error');
        expect(resultNativeError.getLineNumber()).to.equal(1);
        expect(resultNativeError.getMessage()).to.equal('syntax error, unexpected end of file');
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });
});
