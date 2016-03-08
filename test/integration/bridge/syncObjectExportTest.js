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
    phpCore = require('../../../sync'),
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs');

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
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return phpCore;
            }),
            phpEngine = module(),
            myObject;

        phpEngine.expose({
            addOneTo: function (what) {
                return what + 1;
            }
        }, 'tools');

        myObject = phpEngine.execute().unwrapForJS();

        expect(myObject.callMethod('addAndGetWhat', 20).getNative()).to.equal(23);
    });

    it('should pass JS objects through unwrapped when calling a method', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject->myMethod($jsObject);
EOS
*/;}), //jshint ignore:line
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return phpCore;
            }),
            phpEngine = module(),
            jsObject = {
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
});
