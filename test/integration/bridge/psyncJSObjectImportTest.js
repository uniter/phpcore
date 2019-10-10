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
    tools = require('../tools');

describe('PHP JS<->PHP bridge JS object import Promise-synchronous mode integration', function () {
    it('should allow an imported method to return an FFI Result whose sync handler returns a value', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.psyncTranspile(null, php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return engine.createFFIResult(function () {
                    return 9;
                }, function () {
                    done(new Error('Should have been handled synchronously'));
                });
            }
        }, 'myJSObject');

        engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.equal(30);
            done();
        }).catch(done);
    });

    it('should allow an imported method to throw an error from an FFI result\'s sync handler', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.psyncTranspile(null, php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return engine.createFFIResult(function () {
                    throw new Error('Error from JS-land'); // In Promise-sync mode, only this sync code path can be taken
                }, function () {
                    done(new Error('Should have been handled synchronously'));
                });
            }
        }, 'myJSObject');

        expect(engine.execute()).to.eventually.be.rejectedWith(Error, 'Error from JS-land')
            .notify(done);
    });
});
