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
    it('should inherit the constructor from the parent class', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal('Fred');
    });

    it('should resolve an unprefixed bareword string class name relative to the current namespace', async function () {
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

namespace {
    return (new My\Stuff\MyClass)->fetchIt();
}
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(21);
    });

    it('should resolve a prefixed bareword string class name relative to the root namespace', async function () {
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

namespace {
    return (new My\Stuff\MyClass)->fetchIt();
}
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(21);
    });

    it('should resolve a string class name as a FQCN relative to the root namespace', async function () {
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

namespace {
    return (new My\Space\MyClass)->fetchIt();
}
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(101);
    });

    it('should resolve the special string "self" to the current class', async function () {
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

namespace {
    $result = [];
    $myObject = new My\Space\MyClass(21);
    $newObject = $myObject->cloneMeWith(101);

    $result[] = $myObject->myProp;
    $result[] = $newObject->myProp;

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            101
        ]);
    });

    it('should resolve the special string "static" to the called class in static context', async function () {
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

namespace {
    $result = [];
    $myObject = new My\Space\MyChildClass(21);
    $newObject = $myObject->cloneMeWith(101);

    $result[] = $myObject->getProp();
    $result[] = $newObject->getProp();

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            101
        ]);
    });

    it('should support classes with a property called "length"', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            'first',
            'second',
            'third',
            1
        ]);
    });

    it('should support creating an instance of the static class scope', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            true
        ]);
    });

    it('should correctly handle passing a variable as by-value constructor argument that is then re-assigned within a later argument', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    private $sum;

    public function __construct($arg1, $arg2) {
        $this->sum = $arg1 + $arg2;
    }

    public function getSum() {
        return $this->sum;
    }
}

$result = [];

$yourVar = 100;

$valueAssignmentWithinArg = new MyClass(${($myVar = 21) && false ?: 'myVar'}, ${($myVar = 32) && false ?: 'myVar'});
$referenceAssignmentWithinArg = new MyClass(${($myVar = 21) && false ?: 'myVar'}, ${($myVar =& $yourVar) && false ?: 'myVar'});

$result['value assignment within argument'] = $valueAssignmentWithinArg->getSum();
$result['reference assignment within argument'] = $referenceAssignmentWithinArg->getSum();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            // Value should be resolved at the point the argument is passed.
            'value assignment within argument': 53,

            // First argument should use the original value
            // and not the reference assigned within the second argument.
            'reference assignment within argument': 121
        });
    });

    it('should support accessing members on new without parentheses', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    const MY_CONST = 42;
    public $myProp = 21;
}

$result = [];

$result['const read'] = new MyClass()::MY_CONST;
$result['public property read'] = new MyClass()->myProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'const read': 42,
            'public property read': 21
        });
    });

    it('should support named arguments of constructor parameters', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $first;
    public $second;
    public $third;

    public function __construct($first, $second, $third) {
        $this->first = $first;
        $this->second = $second;
        $this->third = $third;
    }

    public function getNumbers() {
        return 'first: ' . $this->first . ', second: ' . $this->second . ', third: ' . $this->third;
    }
}

$result = [];

$result['from bareword, named arguments only, in different order'] = new MyClass(second: 27, first: 21, third: 100)->getNumbers();
$result['from bareword, named and positional arguments'] = new MyClass(121, third: 200, second: 127)->getNumbers();

$myClassName = 'MyClass';
$result['from string, named arguments only, in different order'] = new $myClassName(second: 27, first: 21, third: 100)->getNumbers();
$result['from string, named and positional arguments'] = new $myClassName(121, third: 200, second: 127)->getNumbers();

$myInstance = new MyClass(1, 2, 3);
$result['from existing instance, named arguments only, in different order'] = new $myInstance(second: 27, first: 21, third: 100)->getNumbers();
$result['from existing instance, named and positional arguments'] = new $myInstance(121, third: 200, second: 127)->getNumbers();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'from bareword, named arguments only, in different order': 'first: 21, second: 27, third: 100',
            'from bareword, named and positional arguments': 'first: 121, second: 127, third: 200',
            'from string, named arguments only, in different order': 'first: 21, second: 27, third: 100',
            'from string, named and positional arguments': 'first: 121, second: 127, third: 200',
            'from existing instance, named arguments only, in different order': 'first: 21, second: 27, third: 100',
            'from existing instance, named and positional arguments': 'first: 121, second: 127, third: 200'
        });
    });

    it('should raise a fatal error on attempting to instantiate an undefined class', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

new SomeUndefinedClass(1001);

EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Class \'SomeUndefinedClass\' not found in my_module.php on line 3'
        );
    });
});
