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

describe('PHP asynchronous execution integration', function () {
    it('should correctly handle returning a string asynchronously', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 'my string';
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php);

        return module().execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.equal('my string');
        });
    });

    it('should correctly handle an exception thrown synchronously (no pause occurs)', async function () {
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
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught MyException: My intentional exception and suffix in /path/to/module.php on line 8'
        );
    });

    it('should correctly handle an exception thrown following resume', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyException extends Exception {
    public function __construct($message) {
        parent::__construct($message . ' and suffix');
    }
}

function causeIssue() {
    $message = get_async('My intentional exception');

    throw new MyException($message);
}

causeIssue();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(value);
                });
            });
        });

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught MyException: My intentional exception and suffix in /path/to/module.php on line 11'
        );
    });
});
