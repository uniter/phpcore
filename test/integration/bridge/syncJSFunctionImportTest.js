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

describe('PHP JS<->PHP bridge JS function import synchronous mode integration', function () {
    it('should allow an imported function to return a value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSFunc();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.expose(function () {
            return 9;
        }, 'myJSFunc');

        expect(engine.execute().getNative()).to.equal(30);
    });

    it('should allow an imported function to throw an error', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSFunc();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.expose(function () {
            throw new Error('Error from JS-land');
        }, 'myJSFunc');

        expect(function () {
            engine.execute();
        }).to.throw(Error, 'Error from JS-land');
    });
});
