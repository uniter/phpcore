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

$result[] = $object2 == $object1; // Private property has the same value
$result[] = $object3 == $object1; // Private property has different values
$result[] = $object4 == $object1; // Protected property has different values

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            true,  // When private property has the same value
            false, // When private property has different values
            false  // When protected property has different values
        ]);
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

$result[] = $object1 === $object1; // Same instance
$result[] = $object2 === $object1; // Different instances of the same class, identical properties

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            true, // When the same instance is being compared with itself
            false // When compared with an instance of the same class with identical properties
        ]);
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
