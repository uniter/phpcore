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

describe('PHP class statement class constant integration', function () {
    it('should allow a backward reference from one constant to another above it', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    const FIRST = 101;

    const SECOND = self::FIRST;
}

$result = [];
$result[] = MyClass::FIRST;
$result[] = MyClass::SECOND;
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            101,
            101
        ]);
    });

    it('should allow a forward reference from one constant to another further down', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    const FIRST = self::SECOND;

    const SECOND = 21;
}

$result = [];
$result[] = MyClass::FIRST;
$result[] = MyClass::SECOND;
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            21
        ]);
    });

    it('should support fetching constants from interfaces and ancestor classes in the hierarchy', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

interface MyFirstInterface {
    const FIRST_CONST = 'first';
}

interface MySecondInterface {
    const SECOND_CONST = 'second';
}

interface MyThirdInterface extends MyFirstInterface, MySecondInterface {
    const THIRD_CONST = 'third';
}

// This interface is deliberately not involved in the interface hierarchy above,
// as it will only be implemented by the child class below
interface MyFourthInterface {
    const FOURTH_CONST = 'fourth';
}

class MyParentClass implements MyThirdInterface {
    const PARENT_CONST = 'from parent';
}

class MyChildClass extends MyParentClass implements MyFourthInterface {
    const CHILD_CONST = 'from child';
}

$result = [];
$result['first const'] = MyChildClass::FIRST_CONST;
$result['second const'] = MyChildClass::SECOND_CONST;
$result['third const'] = MyChildClass::THIRD_CONST;
$result['fourth const'] = MyChildClass::FOURTH_CONST;
$result['parent const'] = MyChildClass::PARENT_CONST;
$result['child const'] = MyChildClass::CHILD_CONST;
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php);

        expect(module().execute().getNative()).to.deep.equal({
            'first const': 'first',
            'second const': 'second',
            'third const': 'third',
            'fourth const': 'fourth',
            'parent const': 'from parent',
            'child const': 'from child'
        });
    });
});
