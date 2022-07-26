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

describe('PHP object comparison integration', function () {
    it('should compare objects for equality based on all of their properties', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    private $myPrivateProp;
    protected $myProtectedProp;
    public $myPublicProp = 21;

    public function __construct($privateProp, $protectedProp) {
        $this->myPrivateProp = $privateProp;
        $this->myProtectedProp = $protectedProp;
    }
}

$object1 = new MyClass('one private', 'one protected');
$object2 = new MyClass('one private', 'one protected');
$object3 = new MyClass('another private', 'one protected');
$object4 = new MyClass('one private', 'another protected');
$result = [];

$result['private prop has same value'] = $object2 == $object1;
$result['private prop has different values'] = $object3 == $object1;
$result['protected prop has different values'] = $object4 == $object1;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'private prop has same value': true,
            'private prop has different values': false,
            'protected prop has different values': false
        });
    });

    it('should always treat instances of different classes as inequal', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    private $theProp = 'the value';
}
class YourClass {
    private $theProp = 'the value';
}

$object1 = new MyClass;
$object2 = new YourClass;

$result = [];

$result['=='] = $object1 == $object2;
$result['!='] = $object1 != $object2;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            '==': false,
            '!=': true
        });
    });

    it('should only treat two references to the same object as being identical', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    private $mySecretProp;
    public $myPublicProp = 21;

    public function __construct($secret) {
        $this->mySecretProp = $secret;
    }
}

$object1 = new MyClass('one value');
$object2 = new MyClass('one value');
$result = [];

$result['same instance'] = $object1 === $object1;
// Different instances of the same class, identical properties
$result['different instances, identical props'] = $object2 === $object1;
$result['different classes'] = (new stdClass) === $object1;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            // When the same instance is being compared with itself.
            'same instance': true,
            // When compared with an instance of the same class with identical properties.
            'different instances, identical props': false,

            'different classes': false
        });
    });

    it('should raise an error when attempting to compare a recursive structure loosely', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {}

$firstObject = new MyClass;
$secondObject = new MyClass;

$firstObject->myProp = $secondObject;
$secondObject->myProp = $firstObject;

// Use loose equality as it will be recursive.
return $firstObject == $secondObject;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Nesting level too deep - recursive dependency? in /path/to/my_module.php on line 12'
        );
    });
});
