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

describe('PHP new operator integration', function () {
    it('should inherit the constructor from the parent class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyParent
{
    public $name;

    public function __construct($name)
    {
        $this->name = $name;
    }
}

class MyChild extends MyParent
{
}

return new MyChild('Fred')->name;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.equal('Fred');
    });

    it('should resolve an unprefixed bareword string class name relative to the current namespace', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    class MyClass
    {
        public function fetchIt()
        {
            $otherObject = new In\Here\MyOtherClass(21);

            return $otherObject->getIt();
        }
    }
}

namespace My\Stuff\In\Here
{
    class MyOtherClass
    {
        private $it;

        public function __construct($it)
        {
            $this->it = $it;
        }

        public function getIt()
        {
            return $this->it;
        }
    }
}

return (new My\Stuff\MyClass)->fetchIt();

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.equal(21);
    });

    it('should resolve a prefixed bareword string class name relative to the root namespace', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    class MyClass
    {
        public function fetchIt()
        {
            $otherObject = new \There\MyOtherClass(21);

            return $otherObject->getIt();
        }
    }
}

namespace There
{
    class MyOtherClass
    {
        private $it;

        public function __construct($it)
        {
            $this->it = $it;
        }

        public function getIt()
        {
            return $this->it;
        }
    }
}

return (new My\Stuff\MyClass)->fetchIt();

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.equal(21);
    });

    it('should resolve a string class name as a FQCN relative to the root namespace', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space
{
    class MyClass
    {
        public function fetchIt()
        {
            $className = 'Your\Space\YourClass';

            $yourObject = new $className(101);

            return $yourObject->getIt();
        }
    }
}

namespace Your\Space
{
    class YourClass
    {
        private $it;

        public function __construct($it)
        {
            $this->it = $it;
        }

        public function getIt()
        {
            return $this->it;
        }
    }
}

return (new My\Space\MyClass)->fetchIt();

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.equal(101);
    });

    it('should resolve the special string "self" to the current class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space
{
    class MyClass
    {
        public $myProp;

        public function __construct($myProp)
        {
            $this->myProp = $myProp;
        }

        public function cloneMeWith($newProp)
        {
            return new self($newProp);
        }
    }
}

$result = [];
$myObject = new My\Space\MyClass(21);
$newObject = $myObject->cloneMeWith(101);

$result[] = $myObject->myProp;
$result[] = $newObject->myProp;

return $result;

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            101
        ]);
    });

    it('should resolve the special string "static" to the called class in static context', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space
{
    class MyParentClass
    {
        protected $myProp;

        public function __construct($myProp)
        {
            $this->myProp = $myProp;
        }

        public function cloneMeWith($newProp)
        {
            return new static($newProp);
        }
    }

    class MyChildClass extends MyParentClass
    {
        // Define this only in the child class, to prove that the `new static(...)` above
        // creates a new instance of this derived class and not a new instance of the parent
        public function getProp()
        {
            return $this->myProp;
        }
    }
}

$result = [];
$myObject = new My\Space\MyChildClass(21);
$newObject = $myObject->cloneMeWith(101);

$result[] = $myObject->getProp();
$result[] = $newObject->getProp();

return $result;

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            101
        ]);
    });

    it('should support classes with a property called "length"', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $firstProp = 'first';
    public $secondProp = 'second';
    public $thirdProp = 'third';

    public $length = 1;
}

$result = [];
$myObject = new MyClass();

$result[] = $myObject->firstProp;
$result[] = $myObject->secondProp;
$result[] = $myObject->thirdProp;
$result[] = $myObject->length;

return $result;

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'first',
            'second',
            'third',
            1
        ]);
    });

    it('should support creating an instance of the static class scope', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyParentClass {
    public $number;

    public function __construct($number) {
        $this->number = $number;
    }

    public function duplicateMe() {
        return new static($this->number);
    }
}

class MyChildClass extends MyParentClass {
    public function getNumber() {
        return $this->number;
    }
}

$result = [];
$original = new MyChildClass(21);
$duplicate = $original->duplicateMe();

$result[] = $duplicate->getNumber();
$result[] = $duplicate instanceof MyChildClass;

return $result;

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            true
        ]);
    });

    it('should raise a fatal error on attempting to instantiate an undefined class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

new SomeUndefinedClass(1001);

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Class \'SomeUndefinedClass\' not found in my_module.php on line 3'
        );
    });
});
