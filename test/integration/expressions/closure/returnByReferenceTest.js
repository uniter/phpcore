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

describe('PHP closure/anonymous function return-by-reference integration', function () {
    it('should be able to return a reference to a by-value parameter variable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myClosure = function &(int $myValue = 21) : int {
    return $myValue;
};

$result = [];

$myVar =& $myClosure();
$result['myVar initially'] = $myVar;

// Note that the parameter's type is no longer enforced.
$myVar = 'a string';
$result['myVar after assignment'] = $myVar;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'myVar initially': 21,
            'myVar after assignment': 'a string'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should be able to return a reference to a by-reference parameter variable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myClosure = function &(int &$myValue) : int {
    return $myValue;
};

$result = [];

$myVar = 21;
$myRef =& $myClosure($myVar);
$result['myVar initially'] = $myVar;
$result['myRef initially'] = $myRef;

// Note that the parameter's type is no longer enforced.
$myVar = 'a string';
$result['myVar after assignment via $myVar'] = $myVar;
$result['myRef after assignment via $myVar'] = $myRef;

$myRef = 'another string';
$result['myVar after assignment via $myRef'] = $myVar;
$result['myRef after assignment via $myRef'] = $myRef;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'myVar initially': 21,
            'myRef initially': 21,
            'myVar after assignment via $myVar': 'a string',
            'myRef after assignment via $myVar': 'a string',
            'myVar after assignment via $myRef': 'another string',
            'myRef after assignment via $myRef': 'another string'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should be able to return a reference to a static variable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myClosure = function &() : string {
    static $myStatic = 'first value';

    return $myStatic;
};

$result = [];

$myVar =& $myClosure();
$result['myVar initially'] = $myVar;

$myVar = 'second value';
$result['myVar after assignment'] = $myVar;

// Fetch the static variable again to see if it has been changed by reference above.
$result['$myClosure()'] = $myClosure();

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'myVar initially': 'first value',
            'myVar after assignment': 'second value',
            '$myClosure()': 'second value'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should raise a notice when a value is returned from a return-by-reference closure', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myClosure = function &() : int {
    return 101; // Invalid; should be returning a reference.
};

$result = [];

$myVar =& $myClosure();
$result['myVar initially'] = $myVar;

// Note that the parameter's type is no longer enforced.
$myVar = 'a string';
$result['myVar after assignment'] = $myVar;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'myVar initially': 101,
            'myVar after assignment': 'a string'
        });
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Notice:  Only variable references should be returned by reference in /path/to/my_module.php on line 5\n'
        );
        expect(engine.getStdout().readAll()).to.equal(
            '\nNotice: Only variable references should be returned by reference in /path/to/my_module.php on line 5\n'
        );
    });
});
