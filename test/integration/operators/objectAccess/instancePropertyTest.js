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

    it('should raise a notice but return null for reads of undeclared properties', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

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
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            null
        ]);
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Notice: Undefined property: MyClass::$anUndeclaredProp\n'
        );
    });
});
