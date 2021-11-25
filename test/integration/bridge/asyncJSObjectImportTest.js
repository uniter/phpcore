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
    it('should allow an imported method to return an FFI Result to be waited on', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return engine.createFFIResult(function () {
                    done(new Error('Should have been handled asynchronously'));
                }, function () {
                    return new Promise(function (resolve) {
                        setTimeout(function () {
                            resolve(9);
                        }, 10);
                    });
                });
            }
        }, 'myJSObject');

        engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.equal(30);
            done();
        }).catch(done);
    });

    it('should allow an imported method to reject a Promise returned from an FFI Result', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return engine.createFFIResult(function () {
                    done(new Error('Should have been handled asynchronously'));
                }, function () {
                    return new Promise(function (resolve, reject) {
                        setTimeout(function () {
                            reject(new Error('Error from JS-land'));
                        }, 10);
                    });
                });
            }
        }, 'myJSObject');

        expect(engine.execute()).to.eventually.be.rejectedWith(Error, 'Error from JS-land')
            .notify(done);
    });
});
