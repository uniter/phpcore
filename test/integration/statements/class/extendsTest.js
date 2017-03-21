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
    it('should allow a class to extend another class from a "use" import', function () {
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
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            1001
        ]);
    });
});
