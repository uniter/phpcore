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
    tools = require('../../tools');

describe('PHP builtin stdClass class integration', function () {
    it('should be able to fetch the properties of a plain JS object coerced to stdClass', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myStdClassObject = (object)$myJSObject; // Cast the assoc. array that Uniter will have coerced
$result = [];

$result[] = $myStdClassObject instanceof stdClass;
$result[] = $myStdClassObject->propWithNumber;
$result[] = $myStdClassObject->propWithString;
$result[] = $myStdClassObject->propWithBoolean;
$result[] = ((object)$myStdClassObject->propWithNestedStdClassObject)->subNumberProp;

return $result;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/test/module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllBounds: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        // Note that this POJO will actually be coerced to an assoc. PHP array by Uniter
        engine.defineGlobal('myJSObject', {
            propWithNumber: 21,
            propWithString: 'a string',
            propWithBoolean: true,
            propWithNestedStdClassObject: {
                subNumberProp: 1001
            }
        });

        expect(engine.execute().getNative()).to.deep.equal([
            true, // Check for instance of stdClass
            21,
            'a string',
            true,
            1001
        ]);
    });

    it('should raise a notice and return null for reads of undefined properties of stdClass instances', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

$object = new stdClass;
$result['prop'] = $object->anUndefinedProperty;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/test/module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllBounds: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'prop': null
        });
        expect(engine.getStdout().readAll()).to.equal('\nNotice: Undefined property: stdClass::$anUndefinedProperty in /my/test/module.php on line 7\n');
        expect(engine.getStderr().readAll()).to.equal('PHP Notice:  Undefined property: stdClass::$anUndefinedProperty in /my/test/module.php on line 7\n');
    });
});
