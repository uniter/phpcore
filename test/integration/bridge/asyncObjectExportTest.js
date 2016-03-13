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
    phpCore = require('../../../async'),
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs');

describe('PHP JS<->PHP bridge object export asynchronous mode integration', function () {
    it('should return an object with instance methods returning promises', function () {
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
        return $this->tools->giveMeAsync(2) + $toAdd;
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
            phpEngine = module();

        phpEngine.expose({
            giveMeAsync: function (what) {
                var pause = phpEngine.createPause();

                setTimeout(function () {
                    pause.resume(what);
                });

                pause.now();
            }
        }, 'tools');

        return phpEngine.execute().then(function (valueObject) {
            var myObject = valueObject.getNative();

            return myObject.callMethod('addAndGetWhat', 20).then(function (resultValue) {
                expect(resultValue.getNative()).to.equal(22);
            });
        });
    });
});
