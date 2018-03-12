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

    it('should allow a JS class to call its superconstructor', function () {
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
            module = tools.syncTranspile(null, php),
            environment = tools.createSyncEnvironment();
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
            var TheGrandparent = internals.globalNamespace.getClass('My\\Space\\TheGrandparent');

            function TheParent(theArg) {
                var theArgExtended = internals.valueFactory.createString(
                    theArg.getNative() + '[parent]'
                );

                TheGrandparent.construct(this, [theArgExtended]);
            }

            TheParent.superClass = TheGrandparent;

            internals.disableAutoCoercion();

            return TheParent;
        });

        expect(module({}, environment).execute().getNative()).to.equal('[call][child][parent][grandparent]');
    });
});
