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
    phpCommon = require('phpcommon'),
    tools = require('../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP unset(...) construct integration', function () {
    it('should correctly handle unsetting variables, elements and properties', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$aValue = 'hello';
$object = new stdClass;
$object->myProp = 'here';
$array = [21, 24];

unset($aValue);
unset($object->myProp);
unset($array[1]);

$result = [];
$result[] = isset($aValue);
$result[] = isset($object->myProp);
$result[] = isset($array[1]);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            false,
            false,
            false
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should raise a fatal error when attempting to unset a static property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff {
    class MyClass {
        public static $myProperty = 1001;
    }
}

namespace {
    unset(My\Stuff\MyClass::$myProperty);
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Attempt to unset static property My\\Stuff\\MyClass::$myProperty in /path/to/my_module.php on line 10'
        );
    });
});
