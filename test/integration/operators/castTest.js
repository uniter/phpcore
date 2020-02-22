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

describe('PHP cast operators integration', function () {
    it('should support the (array) cast', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$result[] = (array)21;
$result[] = (array)'my string here';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            [21],
            ['my string here']
        ]);
    });

    it('should include visibilities when casting objects to arrays', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class ParentClass
{
    private $parentPrivateProp = 21;
    public $parentPublicProp = 101;
    protected $parentProtectedProp = 909;
    private $ourPrivateProp = 'for parent';
}

class ChildClass extends ParentClass
{
    private $childPrivateProp = 10001;
    public $childPublicProp = 10007;
    private $ourPrivateProp = 'for child';
}

$object = new ChildClass();

$result = [];
$result[] = (array)$object; // Cast to array from outside class

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            {
                '\0ChildClass\0childPrivateProp': 10001,
                'childPublicProp': 10007,
                '\0ChildClass\0ourPrivateProp': 'for child',
                '\0ParentClass\0parentPrivateProp': 21,
                'parentPublicProp': 101,
                '\0*\0parentProtectedProp': 909,
                '\0ParentClass\0ourPrivateProp': 'for parent'
            }
        ]);
    });

    it('should support the (binary) cast', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$result[] = (binary)21;
$result[] = (binary)'still a string';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            '21', // Just casts to a normal string for now
            'still a string'
        ]);
    });

    it('should support the (bool) cast', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$result[] = (bool)0;
$result[] = (boolean)4;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            false,
            true
        ]);
    });

    it('should support the (float) cast', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$result[] = (float)'21.1';
$result[] = (double)'22.2';
$result[] = (real)'23.5';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21.1,
            22.2,
            23.5
        ]);
    });

    it('should support the (int) cast', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

$result = [];
$result[] = (int)'21.12';
$result[] = (integer)22.23;
$result[] = (int)new stdClass;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('your_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            22,
            1
        ]);
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Notice:  Object of class stdClass could not be converted to number in your_module.php on line 7

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should support the (object) cast', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$result[] = (object)21;
$result[] = (object)['myEl' => 'my value'];

class MyClass {}
$object = new MyClass;
$result[] = (object)$object;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module(),
            value = engine.execute();

        expect(value.getElementByIndex(0).getValue().getType()).to.equal('object');
        expect(value.getElementByIndex(0).getValue().getClassName()).to.equal('stdClass');
        expect(value.getElementByIndex(0).getValue().getNative().scalar).to.equal(21);
        expect(value.getElementByIndex(1).getValue().getType()).to.equal('object');
        expect(value.getElementByIndex(1).getValue().getClassName()).to.equal('stdClass');
        expect(value.getElementByIndex(1).getValue().getNative().myEl).to.equal('my value');
        expect(value.getElementByIndex(2).getValue().getClassName()).to.equal('MyClass');
    });

    it('should support the (string) cast', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$result[] = (string)21;
$result[] = (string)22.2;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            '21',
            '22.2'
        ]);
    });

    it('should support the (unset) cast', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$myFunc = function () use (&$result) {
    $result[] = 22;
    return 23;
};
$result[] = (unset)21;
$result[] = (unset)$myFunc();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            null,
            22, // From $myFunc()
            null
        ]);
    });
});
