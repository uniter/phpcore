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

describe('PHP static property scope resolution "::" integration', function () {
    it('should allow private properties to have different values for different classes in the hierarchy', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyFirstClass {
    private static $mySecretProp = 21;

    public static function getFirstSecret() {
        return self::$mySecretProp;
    }
}

class MySecondClass extends MyFirstClass {
    private static $mySecretProp = 1001;

    public static function getSecondSecret() {
        return self::$mySecretProp;
    }
}

class MyThirdClass extends MySecondClass {
    public static $mySecretProp = 9876;

    public static function getThirdSecret() {
        return self::$mySecretProp;
    }
}

$result = [];
$result[] = MyThirdClass::getFirstSecret();
$result[] = MyThirdClass::getSecondSecret();
$result[] = MyThirdClass::getThirdSecret();
$result[] = MyThirdClass::$mySecretProp; // The public one should be exposed and not either of the private ones

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            1001,
            9876, // Via getter
            9876  // Accessing as prop from outside the class
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
