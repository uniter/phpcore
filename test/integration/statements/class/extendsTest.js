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

describe('PHP class statement "extends" integration', function () {
    it('should allow a class to extend another class from a "use" import', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space {
    class MyClass {
        public function first() {
            return 21;
        }
    }
}

namespace Your\Class {
    use My\Space\MyClass;

    class YourClass extends MyClass {
        public function second() {
            return 1001;
        }
    }
}

namespace {
    $object = new \Your\Class\YourClass();
    $result = [];
    $result[] = $object->first();
    $result[] = $object->second();

    return $result;
}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            1001
        ]);
    });

    it('should allow a class to extend another autoloaded class', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// Define the autoloader in a separate namespace block, to avoid the class definitions being hoisted above it
// FIXME: Uniter's hoisting logic is not complete - currently all classes and functions are hoisted,
//        which is not quite the correct behaviour.
namespace My\Lib {
    spl_autoload_register(function ($className) {
        // Note that the asynchronous call here will cause a pause to occur during autoloading
        switch (get_async($className)) {
            case 'My\Lib\MyParentClass':
                class MyParentClass {}
                break;
            default:
                throw new \Exception('Unsupported class: ' . $className);
        }
    });
}

namespace My\Lib {
    // NB: Not defined statically - autoloaded (see above)
    // class MyParentClass {}

    class MyChildClass extends MyParentClass {
        public $myProp = 21;
    }
}

namespace {
    use My\Lib\MyChildClass;

    $result = [];

    $myObject = new MyChildClass;
    $result[] = $myObject->myProp;

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(value);
                    });
                });
            };
        });

        expect((await engine.execute()).getNative()).to.deep.equal([
            21
        ]);
    });

    // TODO: Note that hoisting is incomplete, as namespaces are not taken into account.
    //       Fixing will require the planned refactor to remove NamespaceScope.
    it('should allow a class to extend another class defined after it', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyChildClass extends MyParentClass {
    public function getIt() {
        return parent::getIt() + 100;
    }
}

class MyParentClass {
    public function getIt() {
        return 21;
    }
}

$object = new MyChildClass;

return $object->getIt();
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(121);
    });

    it('should allow a JS class to call its superconstructor', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace Your\Space {
    use My\Space\TheParent;

    class TheChild extends TheParent {
        public function __construct($arg) {
            parent::__construct($arg . '[child]');
        }
    }
}

namespace {
    $object = new \Your\Space\TheChild('[call]');

    return $object->getTheArg();
}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine,
            environment = tools.createAsyncEnvironment();
        environment.defineClass('My\\Space\\TheGrandparent', function (internals) {
            function TheGrandparent(theArg) {
                var theArgExtended = internals.valueFactory.createString(
                    theArg.getNative() + '[grandparent]'
                );

                this.setInternalProperty('theArg', theArgExtended);
            }

            TheGrandparent.prototype.getTheArg = function () {
                return this.getInternalProperty('theArg');
            };

            internals.disableAutoCoercion();

            return TheGrandparent;
        });
        environment.defineClass('My\\Space\\TheParent', function (internals) {
            function TheParent(theArg) {
                var theArgExtended = internals.valueFactory.createString(
                    theArg.getNative() + '[parent]'
                );

                return internals.callSuperConstructor(this, [theArgExtended]);
            }

            internals.extendClass('My\\Space\\TheGrandparent');

            internals.disableAutoCoercion();

            return TheParent;
        });
        engine = module({}, environment);

        expect((await engine.execute()).getNative()).to.equal('[call][child][parent][grandparent]');
    });

    it('should allow a JS class to extend a PHP one', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyPHPClass
{
    private $addTo;

    public function __construct($addTo)
    {
        $this->addTo = $addTo;
    }

    public function firstGetIt($num)
    {
        return $num + $this->addTo;
    }
}

return function () {
    $myObject = new MyJSClass(21);

    return $myObject->secondGetIt(5, 10);
};
EOS
*/;}),//jshint ignore:line,
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            returnedClosure = (await engine.execute()).getNative();

        engine.defineClass('MyJSClass', function (internals) {
            function MyJSClass() {
                return internals.callSuperConstructor(this, arguments);
            }

            internals.extendClass('MyPHPClass');

            MyJSClass.prototype.secondGetIt = function (first, second) {
                return this.callMethod('firstGetIt', [first]).next(function (resultValue) {
                    return resultValue.add(second);
                });
            };

            internals.disableAutoCoercion();

            return MyJSClass;
        });

        expect(await returnedClosure()).to.equal(36);
    });
});
