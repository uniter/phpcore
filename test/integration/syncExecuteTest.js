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
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    syncPhpCore = require('../../sync'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP synchronous execution integration', function () {
    it('should correctly handle returning a string synchronously', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 'my string';
EOS
*/;}), //jshint ignore:line
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return syncPhpCore;
            });

        expect(module().execute().getNative()).to.equal('my string');
    });

    it('should correctly handle an exception synchronously', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
throw new Exception('My intentional exception');
EOS
*/;}), //jshint ignore:line
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return syncPhpCore;
            });

        expect(function () {
            module().execute();
        }).to.throw(PHPFatalError, 'PHP Fatal error: Uncaught exception \'Exception\'');
    });
});
