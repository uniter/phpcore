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

describe('PHP undefined references integration', function () {
    var doRun,
        outputLog;

    beforeEach(function () {
        outputLog = [];
        doRun = function (engine) {
            // Capture the standard streams, prefixing each write with its name
            // so that we can ensure that what is written to each of them is in the correct order
            // with respect to one another.
            engine.getStdout().on('data', function (data) {
                outputLog.push('[stdout]' + data);
            });
            engine.getStderr().on('data', function (data) {
                outputLog.push('[stderr]' + data);
            });

            return engine.execute();
        };
    });

    it('should correctly handle reads of undefined variables', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 'On');

$result = [];

$result['variable'] = $myUndefinedVariable;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'variable': null
        });
        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Notice:  Undefined variable: myUndefinedVariable in /path/to/my_module.php on line 7

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message.
            nowdoc(function () {/*<<<EOS
[stdout]
Notice: Undefined variable: myUndefinedVariable in /path/to/my_module.php on line 7

EOS
*/;}) //jshint ignore:line
        ]);
    });

    it('should correctly handle reads of undefined array elements', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 'On');

$result = [];
$myArray = [];

$result['array element'] = $myArray['my undefined element'];
$result['nested array element'] = $myArray['my undefined element']['your undefined element'];

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'array element': null,
            'nested array element': null
        });
        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Notice:  Undefined offset: my undefined element in /path/to/my_module.php on line 8

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message.
            nowdoc(function () {/*<<<EOS
[stdout]
Notice: Undefined offset: my undefined element in /path/to/my_module.php on line 8

EOS
*/;}), //jshint ignore:line
            nowdoc(function () {/*<<<EOS
[stderr]PHP Notice:  Undefined offset: your undefined element in /path/to/my_module.php on line 9

EOS
*/;}), //jshint ignore:line
            // NB: (As above).
            nowdoc(function () {/*<<<EOS
[stdout]
Notice: Undefined offset: your undefined element in /path/to/my_module.php on line 9

EOS
*/;}) //jshint ignore:line
        ]);
    });

    it('should correctly handle reads of undefined instance properties', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 'On');

$result = [];

class MyClass {}
$myObject = new MyClass;

$result['instance property'] = $myObject->myUndefinedProp;
$result['nested instance property'] = $myObject->firstUndefinedProp->secondUndefinedProp;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'instance property': null,
            'nested instance property': null
        });
        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Notice:  Undefined property: MyClass::$myUndefinedProp in /path/to/my_module.php on line 10

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message.
            nowdoc(function () {/*<<<EOS
[stdout]
Notice: Undefined property: MyClass::$myUndefinedProp in /path/to/my_module.php on line 10

EOS
*/;}), //jshint ignore:line
            nowdoc(function () {/*<<<EOS
[stderr]PHP Notice:  Undefined property: MyClass::$firstUndefinedProp in /path/to/my_module.php on line 11

EOS
*/;}), //jshint ignore:line
            // NB: (As above).
            nowdoc(function () {/*<<<EOS
[stdout]
Notice: Undefined property: MyClass::$firstUndefinedProp in /path/to/my_module.php on line 11

EOS
*/;}), //jshint ignore:line
            nowdoc(function () {/*<<<EOS
[stderr]PHP Notice:  Trying to get property of non-object in /path/to/my_module.php on line 11

EOS
*/;}), //jshint ignore:line
            // NB: (As above).
            nowdoc(function () {/*<<<EOS
[stdout]
Notice: Trying to get property of non-object in /path/to/my_module.php on line 11

EOS
*/;}) //jshint ignore:line
        ]);
    });
});
