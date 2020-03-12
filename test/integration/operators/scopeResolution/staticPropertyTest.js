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

describe('PHP static property scope resolution "::" integration', function () {
    it('should allow private properties to have different values for different classes in the hierarchy when third is public', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyFirstClass {
    private static $mySecretProp = 21;

    public static function getFirstSecret() {
        return self::$mySecretProp;
    }
}

class MySecondClass extends MyFirstClass {
    private static $mySecretProp = 1001;

    public static function getSecondSecret() {
        return self::$mySecretProp;
    }
}

class MyThirdClass extends MySecondClass {
    public static $mySecretProp = 9876;

    public static function getThirdSecret() {
        return self::$mySecretProp;
    }
}

$result = [];
$result[] = MyThirdClass::getFirstSecret();
$result[] = MyThirdClass::getSecondSecret();
$result[] = MyThirdClass::getThirdSecret();
$result[] = MyThirdClass::$mySecretProp; // The public one should be exposed and not either of the private ones

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            1001,
            9876, // Via getter
            9876  // Accessing as prop from outside the class
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should allow private properties to have different values for different classes in the hierarchy when third is protected', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyFirstClass {
    private static $mySecretProp = 21;

    public static function getFirstSecret() {
        return self::$mySecretProp;
    }
}

class MySecondClass extends MyFirstClass {
    private static $mySecretProp = 1001;

    public static function getSecondSecret() {
        return self::$mySecretProp;
    }
}

class MyThirdClass extends MySecondClass {
    protected static $mySecretProp = 9876;

    public static function getThirdSecret() {
        return self::$mySecretProp;
    }
}

$result = [];
$result[] = MyThirdClass::getFirstSecret();
$result[] = MyThirdClass::getSecondSecret();
$result[] = MyThirdClass::getThirdSecret();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            1001,
            9876 // Via getter
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should allow a parent class to access a protected static property of a descendant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyFirstClass {
    public function getProtectedSecretFromDescendant() {
        return static::$mySecretProp;
    }
}

class MySecondClass extends MyFirstClass {
}

class MyThirdClass extends MySecondClass {
    protected static $mySecretProp = 9876;
}

$result = [];
$myObject = new MyThirdClass();
$result[] = $myObject->getProtectedSecretFromDescendant();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            9876
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should allow a derived class to override a protected static property of an ancestor', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyFirstClass {
    protected static $mySecretProp = 'initial value to be ignored';

    public function getProtectedSecretFromDescendant() {
        // Even though the property is defined in this class, as it is protected
        // its value is shared with all classes in the same family (all ancestors and descendants)
        // so it may be overridden in the grandchild class below
        return static::$mySecretProp;
    }
}

class MySecondClass extends MyFirstClass {
}

class MyThirdClass extends MySecondClass {
    protected static $mySecretProp = 'overridden initial value';
}

$result = [];
$myObject = new MyThirdClass();
$result[] = $myObject->getProtectedSecretFromDescendant();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'overridden initial value'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should raise a fatal error on attempting to access a private property outside the class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    private static $mySecretProp = 21;
}

return MyClass::$mySecretProp;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot access private property MyClass::$mySecretProp in my_module.php on line 7'
        );
    });

    it('should raise a fatal error on attempting to access a private property from a descendant via self::', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyParentClass {
    private static $mySecretProp = 21;
}

class MyChildClass extends MyParentClass {
    public function getIt() {
        return self::$mySecretProp;
    }
}

$object = new MyChildClass;

return $object->getIt();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot access private property MyChildClass::$mySecretProp in my_module.php on line 9'
        );
    });

    it('should raise a fatal error on attempting to access a private property from a descendant via the class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyParentClass {
    private static $mySecretProp = 21;
}

class MyChildClass extends MyParentClass {
    public function getIt() {
        return MyParentClass::$mySecretProp;
    }
}

$object = new MyChildClass;

return $object->getIt();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot access private property MyParentClass::$mySecretProp in my_module.php on line 9'
        );
    });

    it('should raise a fatal error on attempting to access a protected property outside the class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    protected static $mySecretProp = 21;
}

return MyClass::$mySecretProp;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot access protected property MyClass::$mySecretProp in my_module.php on line 7'
        );
    });

    it('should raise a fatal error on attempting to access a non-existent static property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {}

return MyClass::$myUndefinedProp;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Access to undeclared static property: MyClass::$myUndefinedProp in my_module.php on line 5'
        );
    });

    it('should raise a fatal error on attempting to fetch a static property of an integer', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myInt = 27;

$dummy = $myInt::$myProp;

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
