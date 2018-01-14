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
    tools = require('../tools'),
    Promise = require('lie');

describe('PHP JS<->PHP bridge JS function import asynchronous mode integration', function () {
    it('should allow an imported function to return a Promise to be waited on', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSFunc();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module();

        engine.expose(function () {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve(9);
                }, 10);
            });
        }, 'myJSFunc');

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.equal(30);
        });
    });

    it('should allow an imported function to reject a returned Promise', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSFunc();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module();

        engine.expose(function () {
            return new Promise(function (resolve, reject) {
                setTimeout(function () {
                    reject(new Error('Error from JS-land'));
                }, 10);
            });
        }, 'myJSFunc');

        return expect(engine.execute()).to.eventually.be.rejectedWith(Error, 'Error from JS-land');
    });
});
