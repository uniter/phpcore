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

describe('PHP instance property object access "->" integration', function () {
    it('should allow properties with or without an initial value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    private $firstProp;
    private $secondProp = 21;

    public function getFirstProp() {
        return $this->firstProp;
    }

    public function getSecondProp() {
        return $this->secondProp;
    }
}

$result = [];
$object = new MyClass;
$result[] = $object->getFirstProp();
$result[] = $object->getSecondProp();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            null,
            21
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should allow private properties to have different values for different classes in the hierarchy when third is public', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyFirstClass {
    private $mySecretProp = 21;

    public function getFirstSecret() {
        return $this->mySecretProp;
    }
}

class MySecondClass extends MyFirstClass {
    private $mySecretProp = 1001;

    public function getSecondSecret() {
        return $this->mySecretProp;
    }
}

class MyThirdClass extends MySecondClass {
    public $mySecretProp = 9876;

    public function getThirdSecret() {
        return $this->mySecretProp;
    }
}

$result = [];
$myObject = new MyThirdClass();
$result[] = $myObject->getFirstSecret();
$result[] = $myObject->getSecondSecret();
$result[] = $myObject->getThirdSecret();
$result[] = $myObject->mySecretProp; // The public one should be exposed and not either of the private ones

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
    private $mySecretProp = 21;

    public function getFirstSecret() {
        return $this->mySecretProp;
    }
}

class MySecondClass extends MyFirstClass {
    private $mySecretProp = 1001;

    public function getSecondSecret() {
        return $this->mySecretProp;
    }
}

class MyThirdClass extends MySecondClass {
    protected $mySecretProp = 9876;

    public function getThirdSecret() {
        return $this->mySecretProp;
    }
}

$result = [];
$myObject = new MyThirdClass();
$result[] = $myObject->getFirstSecret();
$result[] = $myObject->getSecondSecret();
$result[] = $myObject->getThirdSecret();

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

    it('should allow a parent class to access a protected property of a descendant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyFirstClass {
    public function getProtectedSecretFromDescendant() {
        return $this->mySecretProp;
    }
}

class MySecondClass extends MyFirstClass {
}

class MyThirdClass extends MySecondClass {
    protected $mySecretProp = 9876;
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

    it('should allow a derived class to override a protected property of an ancestor', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyFirstClass {
    protected $mySecretProp = 'initial value to be ignored';

    public function getProtectedSecretFromDescendant() {
        // Even though the property is defined in this class, as it is protected
        // its value is shared with all classes in the same family (all ancestors and descendants)
        // so it may be overridden in the grandchild class below
        return $this->mySecretProp;
    }
}

class MySecondClass extends MyFirstClass {
}

class MyThirdClass extends MySecondClass {
    protected $mySecretProp = 'overridden initial value';
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

    it('should raise a notice but return null for reads of undeclared properties', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

class MyClass {
    public function getAnUndeclaredProp() {
        return $this->anUndeclaredProp;
    }
}

$result = [];
$object = new MyClass;
$result[] = $object->getAnUndeclaredProp();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('there.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            null
        ]);
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Notice:  Undefined property: MyClass::$anUndeclaredProp in there.php on line 6\n'
        );
    });

    it('should raise two notices but return null when accessing a static property non-statically', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

class MyClass {
    public static $myStaticProp = 21;

    public function getMyProp() {
        return $this->myStaticProp; // Use `->` rather than `::`
    }
}

$result = [];
$object = new MyClass;
$result[] = $object->getMyProp();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            null
        ]);
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Strict standards:  Accessing static property MyClass::$myStaticProp as non static in my_module.php on line 8\n' +
            'PHP Notice:  Undefined property: MyClass::$myStaticProp in my_module.php on line 8\n'
        );
    });

    it('should raise a fatal error on attempting to access a private property outside the class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    private $mySecretProp = 21;
}

$object = new MyClass;

return $object->mySecretProp;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot access private property MyClass::$mySecretProp in my_module.php on line 9'
        );
    });

    it('should raise a fatal error on attempting to access a private property from an ancestor', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyParentClass {
    public function getIt() {
        return $this->mySecretProp;
    }
}

class MyChildClass extends MyParentClass {
    private $mySecretProp = 21;
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
            'PHP Fatal error: Uncaught Error: Cannot access private property MyChildClass::$mySecretProp in my_module.php on line 5'
        );
    });

    it('should raise a notice and return null on attempting to access a private property from an ancestor when the definer is extended', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Enable notices as we're testing for one being raised

class MyParentClass {
    public function getIt() {
        return $this->mySecretProp;
    }
}

class MyChildClass extends MyParentClass {
    private $mySecretProp = 21;
}

class MyGrandchildClass extends MyChildClass {}

$object = new MyGrandchildClass;

return $object->getIt();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.be.null;
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Notice:  Undefined property: MyGrandchildClass::$mySecretProp in my_module.php on line 6\n'
        );
    });

    it('should raise a fatal error on attempting to access a private property from a descendant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyParentClass {
    private $mySecretProp = 21;
}

class MyChildClass extends MyParentClass {
    public function getIt() {
        return $this->mySecretProp;
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
            // Note that this is different from the behaviour in this scenario for a static property,
            // where the error message would be "Cannot access private property ..."
            'PHP Fatal error: Uncaught Error: Undefined property: MyChildClass::$mySecretProp in my_module.php on line 9'
        );
    });

    it('should raise a fatal error on attempting to access a protected property outside the class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    protected $mySecretProp = 21;
}

$object = new MyClass;

return $object->mySecretProp;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot access protected property MyClass::$mySecretProp in my_module.php on line 9'
        );
    });
});
