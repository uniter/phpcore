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

describe('PHP JS<->PHP bridge JS class import synchronous mode integration', function () {
    it('should allow instantiating a JS class function stored as a property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$object = new $myObject->MyClass(5);

return $object->double(21);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module(),
            myObject = {};
        function MyClass(additional) {
            this.additional = additional;
        }
        MyClass.prototype.double = function (number) {
            return this.additional + number * 2;
        };
        myObject.MyClass = MyClass;

        engine.expose(myObject, 'myObject');

        expect(engine.execute().getNative()).to.equal(47);
    });

    it('should support JS class functions that return a new object from the constructor', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$object = new $MyClass(21);

return $object->myProp;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();
        function MyClass(number) {
            return {
                myProp: number
            };
        }

        engine.expose(MyClass, 'MyClass');

        expect(engine.execute().getNative()).to.equal(21);
    });
});
