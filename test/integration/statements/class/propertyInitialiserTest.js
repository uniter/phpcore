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
    tools = require('../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP class statement property initialiser integration', function () {
    it('should give each instance a separate array object when initialised with one', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myProp = [21];

    public function addOne() {
        $this->myProp[0]++;
    }
}

$firstObject = new MyClass;
$firstObject->addOne();

$secondObject = new MyClass;

$result = [];
$result[] = $firstObject->myProp[0];
$result[] = $secondObject->myProp[0];
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php);

        expect(module().execute().getNative()).to.deep.equal([
            22,
            21
        ]);
    });

    it('should allow instance and static property initialisers to forward-reference constants further down', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myInstanceProp = self::FIRST_CONST;
    public static $myStaticProp = self::SECOND_CONST;

    const FIRST_CONST = 1001;
    const SECOND_CONST = 2222;
}

$myObject = new MyClass;

$result = [];
$result[] = $myObject->myInstanceProp;
$result[] = MyClass::$myStaticProp;
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php);

        expect(module().execute().getNative()).to.deep.equal([
            1001,
            2222
        ]);
    });

    it('should default empty instance or static property initialisers to null', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myInstanceProp;
    private static $myStaticProp;

    public static function getStatic() {
        return self::$myStaticProp;
    }
}

$myObject = new MyClass;

$result = [];
$result[] = $myObject->myInstanceProp;
$result[] = MyClass::getStatic();
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php);

        expect(module().execute().getNative()).to.deep.equal([
            null,
            null
        ]);
    });

    it('should lazily initialise static properties on read', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    spl_autoload_register(function ($className) {
        global $log;

        $log[] = '[autoload] ' . $className;

        // Trigger a pause, to test handling of async operations during autoloading
        switch (get_async($className)) {
            case 'My\Stuff\MyOtherClass':
                class MyOtherClass
                {
                    const MY_OTHER_CONST = 'other const';
                }
                break;
            case 'My\Stuff\FirstOtherClass':
                class FirstOtherClass
                {
                    const FIRST_CONST = 'first const';
                }
                break;
            case 'My\Stuff\SecondOtherClass':
                class SecondOtherClass
                {
                    const SECOND_CONST = 'second const';
                }
                break;
            default:
                throw new \Exception('Unexpected class name "' . $className . '"');
        }
    });
}

namespace
{
    use My\Stuff\MyOtherClass;
    use My\Stuff\FirstOtherClass;
    use My\Stuff\SecondOtherClass;

    $log = [];

    class MyClass
    {
        // Include a constant to check lazily loading of those too
        const MY_CONST = MyOtherClass::MY_OTHER_CONST;

        public static $firstProp = FirstOtherClass::FIRST_CONST;
        public static $secondProp = SecondOtherClass::SECOND_CONST;
    }

    $log[] = '[before]';
    $log[] = '[my const] ' . MyClass::MY_CONST;
    $log[] = '[first prop] ' . MyClass::$firstProp;
    $log[] = '[second prop] ' . MyClass::$secondProp;
    $log[] = '[after]';

    return $log;
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

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal([
                '[before]',
                '[autoload] My\\Stuff\\MyOtherClass',
                '[my const] other const',
                // Note that both static properties are evaluated, causing autoloads,
                // as soon as the first one is referenced
                '[autoload] My\\Stuff\\FirstOtherClass',
                '[autoload] My\\Stuff\\SecondOtherClass',
                '[first prop] first const',
                '[second prop] second const',
                '[after]'
            ]);
        });
    });

    it('should lazily initialise static properties on write (ie. even before read)', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    spl_autoload_register(function ($className) {
        global $log;

        $log[] = '[autoload] ' . $className;

        // Trigger a pause, to test handling of async operations during autoloading
        switch (get_async($className)) {
            case 'My\Stuff\FirstOtherClass':
                class FirstOtherClass
                {
                    const FIRST_CONST = 'first const';
                }
                break;
            case 'My\Stuff\SecondOtherClass':
                class SecondOtherClass
                {
                    const SECOND_CONST = 'second const';
                }
                break;
            default:
                throw new \Exception('Unexpected class name "' . $className . '"');
        }
    });
}

namespace
{
    use My\Stuff\FirstOtherClass;
    use My\Stuff\SecondOtherClass;

    $log = [];

    class MyClass
    {
        public static $firstProp = FirstOtherClass::FIRST_CONST;
        public static $secondProp = SecondOtherClass::SECOND_CONST;
    }

    $log[] = '[before]';
    // Write to the property immediately so that its initial value is never used
    MyClass::$firstProp = 'a new value';
    $log[] = '[first prop] ' . MyClass::$firstProp;
    $log[] = '[second prop] ' . MyClass::$secondProp;
    $log[] = '[after]';

    return $log;
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

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal([
                '[before]',
                // Note that the property's value is still initialised even though
                // it is written to before it is ever read from
                '[autoload] My\\Stuff\\FirstOtherClass',
                '[autoload] My\\Stuff\\SecondOtherClass',
                '[first prop] a new value',
                '[second prop] second const',
                '[after]'
            ]);
        });
    });

    it('should handle asynchronous errors when initialising a static property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    spl_autoload_register(function ($className) {
        // Trigger a pause, to test handling of async operations during autoloading
        switch (get_async($className)) {
            case 'My\Stuff\EmptyClass':
                class EmptyClass
                {
                }
                break;
            default:
                throw new \Exception('Unexpected class name "' . $className . '"');
        }
    });
}

namespace
{
    use My\Stuff\EmptyClass;

    class MyClass
    {
        public static $myProp = EmptyClass::SOME_UNDEFINED_CONST;
    }

    MyClass::$myProp;
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

        return expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Undefined class constant \'SOME_UNDEFINED_CONST\' in /path/to/module.php on line 28'
        );
    });

    it('should initialise instance properties on object instantiation', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    spl_autoload_register(function ($className) {
        global $log;

        $log[] = '[autoload] ' . $className;

        // Trigger a pause, to test handling of async operations during autoloading
        switch (get_async($className)) {
            case 'My\Stuff\MyFirstOtherClass':
                class MyFirstOtherClass
                {
                    const MY_OTHER_CONST = 'first other const';
                }
                break;
            case 'My\Stuff\MySecondOtherClass':
                class MySecondOtherClass
                {
                    const MY_OTHER_CONST = 'second other const';
                }
                break;
            case 'My\Stuff\FirstOtherClass':
                class FirstOtherClass
                {
                    const FIRST_CONST = 'first const';
                }
                break;
            case 'My\Stuff\SecondOtherClass':
                class SecondOtherClass
                {
                    const SECOND_CONST = 'second const';
                }
                break;
            default:
                throw new \Exception('Unexpected class name "' . $className . '"');
        }
    });
}

namespace
{
    use My\Stuff\MyFirstOtherClass;
    use My\Stuff\MySecondOtherClass;
    use My\Stuff\FirstOtherClass;
    use My\Stuff\SecondOtherClass;

    $log = [];

    class MyClass
    {
        // Include a constant and a static property to check lazily loading of those too
        const MY_CONST = MyFirstOtherClass::MY_OTHER_CONST;
        public static $myStaticProp = MySecondOtherClass::MY_OTHER_CONST;

        public $firstProp = FirstOtherClass::FIRST_CONST;
        public $secondProp = SecondOtherClass::SECOND_CONST;
    }

    $log[] = '[before]';
    $myObject = new MyClass;
    $log[] = '[after new]';
    $log[] = '[my const] ' . $myObject::MY_CONST;
    $log[] = '[my static prop] ' . $myObject::$myStaticProp;
    $log[] = '[first prop] ' . $myObject->firstProp;
    $log[] = '[second prop] ' . $myObject->secondProp;
    $log[] = '[after]';

    return $log;
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

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal([
                '[before]',
                // Note that all properties (both static and instance) and constants are initialised on "new".
                '[autoload] My\\Stuff\\MyFirstOtherClass',
                '[autoload] My\\Stuff\\MySecondOtherClass',
                '[autoload] My\\Stuff\\FirstOtherClass',
                '[autoload] My\\Stuff\\SecondOtherClass',
                '[after new]',
                '[my const] first other const',
                '[my static prop] second other const',
                '[first prop] first const',
                '[second prop] second const',
                '[after]'
            ]);
        });
    });
});
