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

describe('PHP empty(...) construct integration', function () {
    it('should correctly handle accessing set but empty variables, elements, properties and exprs', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public static $myVar = 0;
}

$aRandomVar = 0;
$anArray = ['anElement' => false];
$anObject = (object)['aProp' => ''];
function myFunc() {
    return 0;
}

$result = [];
$result[] = empty($aRandomVar);
$result[] = empty($anArray['anElement']);
$result[] = empty($anObject->aProp);
$result[] = empty(myFunc());
$result[] = empty(MyClass::$myVar);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            true, // Values are set but empty, so classed as empty
            true,
            true,
            true,
            true
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle accessing set and non-empty variables, elements, properties and exprs', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public static $myVar = 201;
}

$object = new stdClass;
$aRandomVar = 21;
$anArray = ['anElement' => 100];
$anObject = (object)['aProp' => 27];
function myFunc() {
    return 24;
}

$result = [];
$result[] = empty($aRandomVar);
$result[] = empty($anArray['anElement']);
$result[] = empty($anObject->aProp);
$result[] = empty(myFunc());
$result[] = empty(MyClass::$myVar);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            false, // Values are non-empty, so classed as non-empty
            false,
            false,
            false,
            false
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle accessing undefined variables, elements and properties', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {}
$anArray = ['anElement' => 21];

$object = new stdClass;

$result = [];
$result[] = empty($aRandomVar);
$result[] = empty($anArray['anUndefinedElement']);
$result[] = empty($anUndefinedArray['anElement']);
$result[] = empty($anUndefinedObject->aProp);
$result[] = empty(MyClass::$someUndefinedProp);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            true, // Not defined, so classed as empty
            true,
            true,
            true,
            true
        ]);
        // No warnings/notices should be raised, even though the variable/element/property are not defined
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should not suppress errors from a function called inside empty(...) construct', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

function myFunc() {
    return $anotherUndefVar;
}

$result = empty($undefVar[myFunc()]);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('the_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.be.true; // Expect true, as the variable was not defined
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Notice:  Undefined variable: anotherUndefVar in the_module.php on line 5

EOS
*/;}) //jshint ignore:line
        );
    });
});
