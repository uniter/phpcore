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
    tools = require('../../../tools');

describe('PHP class statement constructor integration', function () {
    it('should support PHP4-style constructors named the same as the class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    class MyClass
    {
        public $myProp;

        public function MyClass($myArg)
        {
            $this->myProp = $myArg * 2;
        }
    }
}

namespace {
    $myObject = new My\Stuff\MyClass(21);

    $result = [];
    $result[] = $myObject->myProp;
    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            42
        ]);
        expect(engine.getStderr().readAll()).to.equal(''); // No warnings or notices expected
    });

    it('should give precedence to __construct() over PHP4-style constructor', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace
{
    ini_set('error_reporting', E_ALL & E_STRICT);
}

namespace My\Stuff
{
    class MyClass
    {
        public $myProp;

        // This one should be overridden (with a strict warning raised)
        public function MyClass($myArg)
        {
            $this->myProp = $myArg * 10;
        }

        public function __construct($myArg)
        {
            $this->myProp = $myArg * 2;
        }
    }
}

namespace {
    $myObject = new My\Stuff\MyClass(21);

    $result = [];
    $result[] = $myObject->myProp;
    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            42
        ]);
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Strict standards:  Redefining already defined constructor for class MyClass in /path/to/my_module.php on line 10\n'
        );
    });
});
