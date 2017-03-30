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

describe('PHP parent:: keyword integration', function () {
    it('should allow referencing the parent class\' properties from class methods and closures', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space
{
    class MyClass
    {
        protected static $firstProp = 21;
        protected static $secondProp = 101;
        protected static $thirdProp = 202;
    }

    class MyDerivedClass extends MyClass
    {
        protected static $firstProp = 555521;
        protected static $secondProp = 5555101;
        protected static $thirdProp = 5555202;

        public function first()
        {
            return parent::$firstProp; // From instance method
        }

        public static function second()
        {
            return parent::$secondProp; // From static method
        }

        public function third()
        {
            return function () {
                return parent::$thirdProp; // From closure returned by instance method
            };
        }
    }
}

namespace
{
    $object = new My\Space\MyDerivedClass;
    $closure = $object->third();

    $result = [];
    $result[] = $object->first();
    $result[] = My\Space\MyDerivedClass::second();
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

    it('should support class constants that refer to others via parent::', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space
{
    class MyClass
    {
        const FIRST_CONST = 'first';
        const SECOND_CONST = 'second';
    }

    class MyDerivedClass extends MyClass
    {
        const FIRST_CONST = parent::SECOND_CONST;
        const SECOND_CONST = 'wrong';
    }
}

namespace
{
    $object = new My\Space\MyDerivedClass;

    $result = [];
    $result[] = My\Space\MyDerivedClass::FIRST_CONST;
    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'second'
        ]);
    });

    it('should support calling overridden parent method from an instance method', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space
{
    class MyClass
    {
        private $firstProp = 21;

        public function myMethod() {
            return $this->firstProp;
        }
    }

    class MyDerivedClass extends MyClass
    {
        private $secondProp = 100;

        public function myMethod() {
            return $this->secondProp + parent::myMethod();
        }
    }
}

namespace
{
    $object = new My\Space\MyDerivedClass;

    $result = [];
    $result[] = $object->myMethod();
    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            121
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
