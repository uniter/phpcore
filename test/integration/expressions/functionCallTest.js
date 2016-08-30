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
    tools = require('../tools'),
    PHPFatalError = require('phpcommon').PHPFatalError;

describe('PHP synchronous function call integration', function () {
    it('should treat function names as case-insensitive', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace {
    function myFunc() {
        return 22;
    }
}

namespace My\App {
    function anotherFunc() {
        return 23;
    }
}

namespace {
    use MY\APP as myapp; // Alias and ref'd class path should be case-insensitive too

    return [
        myfUNC(),
        myApP\ANOTHERfunc()
    ];
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            22,
            23
        ]);
    });

    it('should allow by-ref parameters to have default values', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunc(&$myArg = 1000)
{
    $originalArg = $myArg;

    $myArg = $myArg * 2;

    return $originalArg;
}

$myVar = 21;

$result = [];
$result[] = myFunc($myVar);
$result[] = $myVar;
$result[] = myFunc();
$result[] = $myVar;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            42,
            1000,
            42
        ]);
    });

    it('should raise a fatal error if an integer is passed when a reference is expected', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunction(&$myRef)
{
    $myRef = 21;
}

myFunction(21);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(function () {
            module().execute();
        }.bind(this)).to.throw(PHPFatalError, 'PHP Fatal error: Only variables can be passed by reference');
    });

    it('should support calling static and instance methods with arrays', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public static function myStaticMethod($start)
    {
        return $start + 4;
    }

    public function myInstanceMethod($start)
    {
        return $start * 2;
    }
}

$object = new MyClass;
$staticCallable = ['MyClass', 'myStaticMethod'];
$instanceCallable = [$object, 'myInstanceMethod'];

$result = [];
$result[] = $staticCallable(10);
$result[] = $instanceCallable(20);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            14, // 10 + 4
            40  // 20 * 2
        ]);
    });
});
