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

describe('PHP isset(...) construct integration', function () {
    it('should correctly handle accessing set variables, elements and properties', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public static $myProp = 0;
}

$object = new stdClass;
$aRandomVar = 21;
$anArray = ['anElement' => 100];
$anObject = (object)['aProp' => 27];

$result = [];
$result[] = isset($aRandomVar);
$result[] = isset($anArray['anElement']);
$result[] = isset($anObject->aProp);
$result[] = isset(MyClass::$myProp);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            true,
            true,
            true,
            true
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle accessing undefined variables, elements and properties', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {}

$object = new stdClass;

$result = [];
$result[] = isset($aRandomVar);
$result[] = isset($result['aRandomElement']);
$result[] = isset($object->aProp);
$result[] = isset(MyClass::$myProp);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            false,
            false,
            false,
            false
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should not suppress errors from a function called inside isset(...) construct', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

function myFunc() {
    return $anotherUndefVar;
}

$result = isset($undefVar[myFunc()]);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('a_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.be.false;
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Notice:  Undefined variable: anotherUndefVar in a_module.php on line 5

EOS
*/;}) //jshint ignore:line
        );
    });
});
