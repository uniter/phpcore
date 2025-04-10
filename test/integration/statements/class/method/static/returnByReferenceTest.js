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
    tools = require('../../../../tools');

describe('PHP class static method return-by-reference integration', function () {
    it('should be able to return a reference to a static variable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public static function &myMethod() : string {
        static $myStatic = 'first value';

        return $myStatic;
    }
}

$result = [];

$myVar =& MyClass::myMethod();
$result['myVar initially'] = $myVar;

$myVar = 'second value';
$result['myVar after assignment'] = $myVar;

// Fetch the static variable again to see if it has been changed by reference above.
$result['->myMethod()'] = MyClass::myMethod();

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'myVar initially': 'first value',
            'myVar after assignment': 'second value',
            '->myMethod()': 'second value'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
