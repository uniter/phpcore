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

describe('PHP JS<->PHP bridge JS object import asynchronous mode integration', function () {
    it('should allow an imported method to return a Promise to be waited on', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(9);
                    }, 10);
                });
            }
        }, 'myJSObject');

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.equal(30);
        });
    });

    it('should allow an imported method to reject a returned Promise', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return new Promise(function (resolve, reject) {
                    setTimeout(function () {
                        reject(new Error('Error from JS-land'));
                    }, 10);
                });
            }
        }, 'myJSObject');

        return expect(engine.execute()).to.eventually.be.rejectedWith(Error, 'Error from JS-land');
    });
});
