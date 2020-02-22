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

describe('PHP synchronous static method call integration', function () {
    it('should be able to call a static method using various mechanisms', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Lib {
    class MyClass {
        public static function myStaticMethod($number) {
            return $number;
        }
    }
}

namespace {
    $result = [];

    $result[] = My\Lib\MyClass::myStaticMethod(21);

    $myUnprefixedMethod = 'My\Lib\MyClass::myStaticMethod';
    $result[] = $myUnprefixedMethod(101);
    $myPrefixedMethod = '\My\Lib\MyClass::myStaticMethod';
    $result[] = $myPrefixedMethod(909);
    $myArrayCallable = ['My\Lib\MyClass', 'myStaticMethod'];
    $result[] = $myArrayCallable(1001);

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,  // Bareword call (most common)
            101, // Variable (dynamic) call from string, where string has no leading slash
            909, // Variable (dynamic) call from string, where string has a leading slash
            1001 // Variable (dynamic) call from array
        ]);
    });

    it('should raise a fatal error on attempting to call a static method of an integer', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myInt = 27;

$dummy = $myInt::myMethod();

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Class name must be a valid object or a string in my_module.php on line 5'
        );
    });
});
