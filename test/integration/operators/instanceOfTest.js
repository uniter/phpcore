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

describe('PHP instanceof operator integration', function () {
    it('should return true when object is an instance of the class and false otherwise', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    class MyClass {}
    class SubClass extends MyClass {}
    $object = new MyClass;

    $fqcn = 'My\Stuff\MyClass';
    $notFqcn = 'Some\Random\Class';

    $result = [];
    $result[] = $object instanceof MyClass;
    $result[] = $object instanceof $fqcn;
    $result[] = $object instanceof NonExistentClass;
    $result[] = $object instanceof $notFqcn;
    $result[] = $object instanceof SubClass;
    $result[] = (new SubClass) instanceof MyClass;

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            true,
            true,
            false,
            false,
            false,  // Instance of superclass is not also of subclass
            true    // Instance of subclass is also instance of superclass
        ]);
    });

    it('should return true when object is an instance of a class implementing the interface', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\Stuff;

interface MyInterface {}
interface UnrelatedInterface {}
class MyClass implements MyInterface {}

$object = new MyClass;

$result = [];
$result[] = $object instanceof MyInterface;
$result[] = $object instanceof UnrelatedInterface;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            true,
            false
        ]);
    });
});
