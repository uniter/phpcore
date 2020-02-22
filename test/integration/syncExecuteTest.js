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
    tools = require('./tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP synchronous execution integration', function () {
    it('should correctly handle returning a string synchronously', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 'my string';
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal('my string');
    });

    it('should correctly handle an exception synchronously', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyException extends Exception {
    public function __construct($message) {
        parent::__construct($message . ' and suffix');
    }
}

throw new MyException('My intentional exception');
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught MyException: My intentional exception and suffix in /path/to/module.php on line 8'
        );
    });
});
