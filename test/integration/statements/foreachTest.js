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

describe('PHP "foreach" loop statement integration', function () {
    it('should be able to loop over a simple indexed array', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

foreach (['first', 'second', 'third'] as $key => $value) {
    $result[] = 'value for ' . $key . ' is: ' . $value;
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            'value for 0 is: first',
            'value for 1 is: second',
            'value for 2 is: third'
        ]);
    });

    it('should be able to loop over a simple associative array', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

foreach (['one' => 'first', 'two' => 'second', 'three' => 'third'] as $key => $value) {
    $result[] = 'value for ' . $key . ' is: ' . $value;
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            'value for one is: first',
            'value for two is: second',
            'value for three is: third'
        ]);
    });

    it('should be able to loop over an object that does not implement Traversable', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass {
    public $firstProp = 'one';
    public $secondProp = 'two';
}

$result = [];
$myObject = new MyClass;

foreach ($myObject as $key => $value) {
    $result[] = 'value for ' . $key . ' is: ' . $value;
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            'value for firstProp is: one',
            'value for secondProp is: two'
        ]);
    });
});
