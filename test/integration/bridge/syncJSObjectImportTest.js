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

describe('PHP JS<->PHP bridge JS object import synchronous mode integration', function () {
    it('should allow an imported method to return a value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return 9;
            }
        }, 'myJSObject');

        expect(engine.execute().getNative()).to.equal(30);
    });

    it('should allow an imported method to return a value from an FFI Result synchronous handler', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return engine.createFFIResult(function () {
                    return 9;
                }, function () {
                    done(new Error('Should have been called synchronously'));
                });
            }
        }, 'myJSObject');

        expect(engine.execute().getNative()).to.equal(30);
        done();
    });

    it('should allow an imported method to throw an error', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.expose({
            myMethod: function () {
                throw new Error('Error from JS-land');
            }
        }, 'myJSObject');

        expect(function () {
            engine.execute();
        }).to.throw(Error, 'Error from JS-land');
    });

    it('should allow an imported method to throw an error from a FFI Result synchronous handler', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return engine.createFFIResult(function () {
                    throw new Error('Error from JS-land');
                }, function () {
                    done(new Error('Should have been called synchronously'));
                });
            }
        }, 'myJSObject');

        expect(function () {
            engine.execute();
        }).to.throw(Error, 'Error from JS-land');
        done();
    });
});
