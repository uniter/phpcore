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

    it('should be able to loop over the visible properties of an object that does not implement Traversable', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class ParentClass {
    public $firstProp = 'one';
    public $secondProp = 'two';
    private $privateProp = 'three';
    protected $parentSharedProp = 'four';

    public function getPropsVisibleToParent() {
        $result = [];

        foreach ($this as $key => $value) {
            $result[] = 'value for ' . $key . ' is: ' . $value . ' - from inside ParentClass';
        }

        return $result;
    }
}
class ChildClass extends ParentClass {
    private $childProp = 'five';
    protected $childSharedProp = 'six';

    public function getPropsVisibleToChild() {
        $result = [];

        foreach ($this as $key => $value) {
            $result[] = 'value for ' . $key . ' is: ' . $value . ' - from inside ChildClass';
        }

        return $result;
    }
}

$result = [];
$myObject = new ChildClass;

foreach ($myObject as $key => $value) {
    $result[] = 'value for ' . $key . ' is: ' . $value . ' - from outside the class';
}

$result[] = $myObject->getPropsVisibleToParent();
$result[] = $myObject->getPropsVisibleToChild();

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            'value for firstProp is: one - from outside the class',
            'value for secondProp is: two - from outside the class',
            // Private property should not be accessible from outside the class
            [
                'value for childSharedProp is: six - from inside ParentClass',
                'value for firstProp is: one - from inside ParentClass',
                'value for secondProp is: two - from inside ParentClass',
                'value for privateProp is: three - from inside ParentClass',
                'value for parentSharedProp is: four - from inside ParentClass'
            ],
            [
                'value for childProp is: five - from inside ChildClass',
                'value for childSharedProp is: six - from inside ChildClass',
                'value for firstProp is: one - from inside ChildClass',
                'value for secondProp is: two - from inside ChildClass',
                'value for parentSharedProp is: four - from inside ChildClass'
            ]
        ]);
    });

    it('should be able to loop over an array fetched from instance property inside a closure passed as function arg', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function callIt($aFunction) {
    $aFunction();
}

callIt(function () {
    global $result;

    $myObject = new stdClass;
    $myObject->myArray = ['first', 'second', 'third'];

    foreach ($myObject->myArray as $key => $value) {
        $result[] = 'value for ' . $key . ' is: ' . $value;
    }
});

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
});
