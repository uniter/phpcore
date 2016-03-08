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
    tools = require('./tools');

describe('PHP<->JS Bridge integration', function () {
    it('should support exposing a number as a PHP global', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return $myNum + 4;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module();

        engine.expose(18, 'myNum');

        engine.execute().then(function (result) {
            expect(result.getNative()).to.equal(22);
            done();
        }, done).catch(done);
    });

    it('should support exposing a JS array with non-numeric properties', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = $myArray[0];
$result[] = $myArray['myProp'];
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module(),
            myArray = [27];
        myArray.myProp = 31;

        engine.expose(myArray, 'myArray');

        engine.execute().then(function (result) {
            expect(result.getNative()).to.deep.equal([
                27,
                31
            ]);
            done();
        }, done).catch(done);
    });

    it('should use null as the thisObj when calling a JS function directly', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return $myJSFunc(21);
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module();

        engine.expose(function (myArg) {
            expect(this).to.be.null;

            return myArg + 4;
        }, 'myJSFunc');

        engine.execute().then(function (result) {
            expect(result.getNative()).to.equal(25);
            done();
        }, done).catch(done);
    });
});
