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

describe('PHP new operator integration', function () {
    it('should inherit the constructor from the parent class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyParent
{
    public $name;

    public function __construct($name)
    {
        $this->name = $name;
    }
}

class MyChild extends MyParent
{
}

return new MyChild('Fred')->name;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.equal('Fred');
    });

    it('should allow instantiating a JS class function stored as a property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$object = new ($myObject->MyClass)(5);

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
});
