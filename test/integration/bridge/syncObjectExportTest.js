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
    PHPFatalError = require('phpcommon').PHPFatalError;

describe('PHP JS<->PHP bridge object export synchronous mode integration', function () {
    it('should return an object with instance methods', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    private $tools;

    public function __construct($tools)
    {
        $this->tools = $tools;
    }

    public function addAndGetWhat($toAdd)
    {
        return $this->tools->addOneTo(2) + $toAdd;
    }
}

$myObject = new MyClass($tools);

return $myObject;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            phpEngine = module(),
            myObject;

        phpEngine.expose({
            addOneTo: function (what) {
                return what + 1;
            }
        }, 'tools');

        myObject = phpEngine.execute().getNative();

        expect(myObject.addAndGetWhat(20)).to.equal(23);
    });

    it('should pass JS objects through unwrapped when calling a method', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject->myMethod($jsObject);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            phpEngine = module(),
            jsObject = {
                toForceObjectCast: function () {},
                myProp: 21
            };

        phpEngine.expose({
            myMethod: function (jsObjectFromPHP) {
                jsObjectFromPHP.myProp = 27;
            }
        }, 'myObject');
        phpEngine.expose(jsObject, 'jsObject');

        phpEngine.execute();

        expect(jsObject.myProp).to.equal(27);
    });

    it('should not match JS object methods case-insensitively', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject->myMETHODWithDifferentCase();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            phpEngine = module(),
            myObject = {
                myMethodWithDifferentCase: function () {}
            };

        // Ensure we don't use property iteration - would break with DOM objects in Chrome
        Object.defineProperty(myObject, 'toCheckForUnwantedIteration', {
            get: function () {
                throw new Error('Properties should not be iterated over');
            }
        });
        phpEngine.expose(myObject, 'myObject');

        expect(function () {
            phpEngine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Call to undefined method JSObject::myMETHODWithDifferentCase() in my_module.php on line 2'
        );
    });

    it('should unwrap stdClass instances recursively rather than wrap as PHPObjects', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new stdClass;
$mySubObject = new stdClass;

$myObject->aProp = 21;
$mySubObject->anotherProp = 'hello';
$myObject->aSub = $mySubObject;

return $myObject;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            phpEngine = module(),
            myObject = {
                myMethodWithDifferentCase: function () {}
            };

        // Ensure we don't use property iteration - would break with DOM objects in Chrome
        Object.defineProperty(myObject, 'toCheckForUnwantedIteration', {
            get: function () {
                throw new Error('Properties should not be iterated over');
            }
        });
        phpEngine.expose(myObject, 'myObject');

        expect(phpEngine.execute().getNative()).to.deep.equal({
            aProp: 21,
            aSub: {
                anotherProp: 'hello'
            }
        });
    });

    it('should extract the error details from a custom Exception thrown by an instance method and throw an appropriate JS Error', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class YourException extends Exception
{
    public function __construct($message)
    {
        parent::__construct($message . ' (custom!)');
    }
}

class MyClass
{
    public function throwIt($what)
    {
        throw new YourException('Oh no - ' . $what);
    }
}

return new MyClass();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            phpEngine = module(),
            myObject = phpEngine.execute().getNative();

        expect(function () {
            myObject.throwIt(9001);
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught YourException: Oh no - 9001 (custom!) in /path/to/module.php on line 15'
        );
        expect(phpEngine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught YourException: Oh no - 9001 (custom!) in /path/to/module.php:15
Stack trace:
#0 (JavaScript code)(unknown): MyClass->throwIt(9001)
#1 {main}
  thrown in /path/to/module.php on line 15

EOS
*/;}) //jshint ignore:line
        );
        // NB: Stdout should have a leading newline written out just before the message
        expect(phpEngine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught YourException: Oh no - 9001 (custom!) in /path/to/module.php:15
Stack trace:
#0 (JavaScript code)(unknown): MyClass->throwIt(9001)
#1 {main}
  thrown in /path/to/module.php on line 15

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should always export the same PHP object to the same unwrapped JS object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    private $tools;

    public function get21()
    {
        return 21;
    }
}

$myObject = new MyClass();

return $myObject;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            phpEngine = module(),
            resultValue = phpEngine.execute();

        expect(resultValue.getType()).to.equal('object');
        expect(resultValue.getClassName()).to.equal('MyClass');
        // Deliberately unwrap the object twice
        expect(resultValue.getNative()).to.equal(resultValue.getNative());
    });
});
