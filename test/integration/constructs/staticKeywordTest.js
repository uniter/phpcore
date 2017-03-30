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

describe('PHP static:: keyword integration', function () {
    it('should allow referencing the called class\' constants from class methods and closures', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space
{
    class MyClass
    {
        const FIRST_CONST = 21;
        const SECOND_CONST = 101;
        const THIRD_CONST = 202;
        const FOURTH_CONST = 303;

        public function first()
        {
            return static::FIRST_CONST; // From instance method
        }

        public static function second()
        {
            return static::SECOND_CONST; // From static method
        }

        public function third()
        {
            return function () {
                return static::THIRD_CONST; // From closure returned by instance method
            };
        }

        public static function fourth()
        {
            return function () {
                return static::FOURTH_CONST; // From closure returned by static method
            };
        }
    }

    class MyDerivedClass extends MyClass
    {
        const FIRST_CONST = 77721;
        const SECOND_CONST = 777101;
        const THIRD_CONST = 777202;
        const FOURTH_CONST = 777303;

        // Define a derived class to ensure that static:: refers to the current class
    }
}

namespace Your\Space
{
    // Introduce a parent/calling class scope to check for late static binding resolution
    class YourLogic
    {
        public function go()
        {
            $result = [];

            $parentObject = new \My\Space\MyClass;
            $parentClosureFromInstance = $parentObject->third();
            $parentClosureFromStatic = $parentObject->fourth();

            $result[] = $parentObject->first();
            $result[] = \My\Space\MyClass::second();
            $result[] = $parentClosureFromInstance();
            $result[] = $parentClosureFromStatic();

            $derivedObject = new \My\Space\MyDerivedClass;
            $derivedClosureFromInstance = $derivedObject->third();
            $derivedClosureFromStatic = $derivedObject->fourth();

            $result[] = $derivedObject->first();
            $result[] = \My\Space\MyDerivedClass::second();
            $result[] = $derivedClosureFromInstance();
            $result[] = $derivedClosureFromStatic();

            return $result;
        }
    }
}

namespace
{
    $logic = new Your\Space\YourLogic;

    return $logic->go();
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            101,
            202,
            303,
            77721,
            777101,
            777202,
            777303
        ]);
    });
});
