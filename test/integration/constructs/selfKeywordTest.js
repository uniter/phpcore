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

describe('PHP self:: keyword integration', function () {
    it('should allow referencing class properties from class methods and closures', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space
{
    class MyClass
    {
        private static $firstProp = 21;
        private static $secondProp = 101;
        private static $thirdProp = 202;

        public function first()
        {
            return self::$firstProp; // From instance method
        }

        public static function second()
        {
            return self::$secondProp; // From static method
        }

        public function third()
        {
            return function () {
                return self::$thirdProp; // From closure returned by instance method
            };
        }
    }

    class MyDerivedClass extends MyClass
    {
        // Define a derived class to ensure that self:: still refers to the parent class above
    }
}

namespace
{
    $object = new My\Space\MyDerivedClass;
    $closure = $object->third();

    $result = [];
    $result[] = $object->first();
    $result[] = My\Space\MyClass::second();
    $result[] = $closure();
    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            101,
            202
        ]);
    });

    it('should support rebinding the current class scope of a Closure', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\FirstSpace
{
    class FirstClass
    {
        private static $firstProp = 21;
        private static $secondProp = 27;

        public function instanceGetClosure()
        {
            return function () {
                return self::$firstProp;
            };
        }

        public static function staticGetClosure()
        {
            return function () {
                return self::$secondProp;
            };
        }
    }

    class MyDerivedClass extends FirstClass
    {
        // Define a derived class to ensure that self:: still refers to the parent class above
    }
}

namespace My\SecondSpace
{
    class SecondClass
    {
        private static $firstProp = 101;
        private static $secondProp = 107;
    }
}

namespace
{
    $object = new My\FirstSpace\MyDerivedClass;
    $instanceClosure = $object->instanceGetClosure()->bindTo(null, 'My\SecondSpace\SecondClass');
    $staticClosure = My\FirstSpace\FirstClass::staticGetClosure()->bindTo(null, 'My\SecondSpace\SecondClass');

    $result = [];
    $result[] = $instanceClosure();
    $result[] = $staticClosure();
    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            101,
            107
        ]);
    });

    it('should support class constants that refer to others via self::', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space
{
    class MyClass
    {
        const FIRST_CONST = 21;
        const SECOND_CONST = self::FIRST_CONST;
    }

    // Define a derived class to ensure that self:: still refers to the parent class above
    class MyDerivedClass extends MyClass
    {
        const FIRST_CONST = 1001; // Should be ignored by the self:: references above
    }
}

namespace
{
    $result = [];
    $result[] = My\Space\MyDerivedClass::SECOND_CONST;
    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21
        ]);
    });

    it('should support instance and static properties that refer to constants via self::', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space
{
    class MyClass
    {
        const MY_CONST = 21;

        public $myInstanceProp = self::MY_CONST;
        public static $myStaticProp = self::MY_CONST;
    }

    // Define a derived class to ensure that self:: still refers to the parent class above
    class MyDerivedClass extends MyClass
    {
        const MY_CONST = 1001; // Should be ignored by the self:: references above
    }
}

namespace
{
    $object = new My\Space\MyDerivedClass;

    $result = [];
    $result[] = $object->myInstanceProp;
    $result[] = My\Space\MyDerivedClass::$myStaticProp;
    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            21
        ]);
    });
});
