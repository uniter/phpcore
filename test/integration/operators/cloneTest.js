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

describe('PHP clone operator integration', function () {
    it('should support cloning a stdClass instance', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$original = new stdClass;
$original->prop1 = ['one'];
$original->prop2 = 'two';

$clone = clone $original;

$result = [];

// Before modification
$result['identity'] = $clone === $original;
$result['original prop1, first'] = $original->prop1;
$result['original prop2, first'] = $original->prop2;
$result['clone prop1, first'] = $clone->prop1;
$result['clone prop2, first'] = $clone->prop2;

// After modification
$clone->prop1[] = 'extra';
$clone->prop2 = 'two, but modified';

$result['original prop1, second'] = $original->prop1;
$result['original prop2, second'] = $original->prop2; // Should not be modified
$result['clone prop1, second'] = $clone->prop1;
$result['clone prop2, second'] = $clone->prop2;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'identity': false, // Clone should be a different object instance,
            'original prop1, first': ['one'],
            'original prop2, first': 'two',
            'clone prop1, first': ['one'],
            'clone prop2, first': 'two',

            'original prop1, second': ['one'], // Should not be modified
            'original prop2, second': 'two',   // Should not be modified
            'clone prop1, second': ['one', 'extra'],
            'clone prop2, second': 'two, but modified'
        });
    });

    it('should support cloning an instance of a custom class implementing __clone defined in PHP-land', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$counter = 1;

class MyClass {
    public $prop1;
    public $prop2;
    public $prop3;

    public function __construct() {
        global $counter;

        $this->prop3 = 'set by constructor: ' . ($counter++);
    }

    public function __clone() {
        $this->prop2 .= ', modified by __clone';
    }
}

$original = new MyClass;
$original->prop1 = 'one';
$original->prop2 = 'two';

$clone = clone $original;

$result = [];

// Before modification
$result['identity'] = $clone === $original;
$result['original prop1, first'] = $original->prop1;
$result['original prop2, first'] = $original->prop2;
$result['original prop3, first'] = $original->prop3;
$result['clone prop1, first'] = $clone->prop1;
$result['clone prop2, first'] = $clone->prop2;
$result['clone prop3, first'] = $clone->prop3;

// After modification
$clone->prop1 = 'one, but modified outside class';

$result['original prop1, second'] = $original->prop1;
$result['original prop2, second'] = $original->prop2; // Should not be modified
$result['original prop3, second'] = $original->prop3;
$result['clone prop1, second'] = $clone->prop1;
$result['clone prop2, second'] = $clone->prop2;
$result['clone prop3, second'] = $clone->prop3;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'identity': false, // Clone should be a different object instance,
            'original prop1, first': 'one',
            'original prop2, first': 'two',
            'original prop3, first': 'set by constructor: 1',
            'clone prop1, first': 'one',
            'clone prop2, first': 'two, modified by __clone',
            'clone prop3, first': 'set by constructor: 1', // Constructor should not be re-called for clone

            'original prop1, second': 'one',
            'original prop2, second': 'two', // Should not be modified
            'original prop3, second': 'set by constructor: 1',
            'clone prop1, second': 'one, but modified outside class',
            'clone prop2, second': 'two, modified by __clone',
            'clone prop3, second': 'set by constructor: 1'
        });
    });

    it('should support cloning an instance of a custom non-coercing JS class implementing __clone defined in JS-land', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$counter = 1;

$original = new MyClass;
$original->prop1 = 'one';
$original->prop2 = 'two';

$clone = clone $original;

$result = [];

// Before modification
$result['identity'] = $clone === $original;
$result['original prop1, first'] = $original->prop1;
$result['original prop2, first'] = $original->prop2;
$result['original prop3, first'] = $original->prop3;
$result['clone prop1, first'] = $clone->prop1;
$result['clone prop2, first'] = $clone->prop2;
$result['clone prop3, first'] = $clone->prop3;

// After modification
$clone->prop1 = 'one, but modified outside class';

$result['original prop1, second'] = $original->prop1;
$result['original prop2, second'] = $original->prop2; // Should not be modified
$result['original prop3, second'] = $original->prop3;
$result['clone prop1, second'] = $clone->prop1;
$result['clone prop2, second'] = $clone->prop2;
$result['clone prop3, second'] = $clone->prop3;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.defineClass('MyClass', function (internals) {
            var valueFactory = internals.valueFactory;

            function MyClass() {
                this.setProperty('prop1', valueFactory.createNull());
                this.setProperty('prop2', valueFactory.createNull());
                this.setProperty(
                    'prop3',
                    valueFactory.createString(
                        'set by constructor: ' + internals.getGlobal('counter').getNative()
                    )
                );

                internals.setGlobal('counter', internals.getGlobal('counter').increment());
            }

            MyClass.prototype.__clone = function () {
                this.setProperty(
                    'prop2',
                    valueFactory.createString(
                        this.getProperty('prop2').getNative() +
                        ', modified by __clone'
                    )
                );
            };

            internals.disableAutoCoercion();

            return MyClass;
        });

        expect(engine.execute().getNative()).to.deep.equal({
            'identity': false, // Clone should be a different object instance,
            'original prop1, first': 'one',
            'original prop2, first': 'two',
            'original prop3, first': 'set by constructor: 1',
            'clone prop1, first': 'one',
            'clone prop2, first': 'two, modified by __clone',
            'clone prop3, first': 'set by constructor: 1', // Constructor should not be re-called for clone

            'original prop1, second': 'one',
            'original prop2, second': 'two', // Should not be modified
            'original prop3, second': 'set by constructor: 1',
            'clone prop1, second': 'one, but modified outside class',
            'clone prop2, second': 'two, modified by __clone',
            'clone prop3, second': 'set by constructor: 1'
        });
    });

    // Introduced in PHP 7.0.0
    it('should support accessing a member of a freshly cloned object in a single expression', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$original = new stdClass;
$original->myProp = 'my value';

$result = [];

$result['myProp of clone'] = (clone $original)->myProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myProp of clone': 'my value'
        });
    });

    it('should support cloning an imported JS object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

// Initially modify originalObject to check the clone starts from this state
// and not the initial state in the object literal below
$originalObject->myProp = 21;
$result['myMethod() of original'] = $originalObject->myMethod();

$cloneObject = clone $originalObject;

// Modify originalObject - make sure it does not impact the clone
$originalObject->myProp = 'my modified value - I should not be used!';

$result['myMethod() of clone'] = $cloneObject->myMethod();

$result['is original instanceof JSObject'] = $originalObject instanceof JSObject;
$result['is clone instanceof JSObject'] = $cloneObject instanceof JSObject;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module(),
            myObject = {
                myProp: 'initial value',
                myMethod: function () {
                    return this.myProp;
                }
            };
        engine.expose(myObject, 'originalObject');

        expect(engine.execute().getNative()).to.deep.equal({
            'myMethod() of original': 21,
            'myMethod() of clone': 21,
            'is original instanceof JSObject': true,
            'is clone instanceof JSObject': true
        });
    });

    it('should raise a fatal error when trying to clone non-objects', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

try {
    $dummy = clone [21, 101];
} catch (Throwable $throwable) {
    $result['array'] = get_my_object_class($throwable) .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

try {
    $dummy = clone true;
} catch (Throwable $throwable) {
    $result['boolean'] = get_my_object_class($throwable) .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

try {
    $dummy = clone 1234.5678;
} catch (Throwable $throwable) {
    $result['float'] = get_my_object_class($throwable) .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

try {
    $dummy = clone 4321;
} catch (Throwable $throwable) {
    $result['integer'] = get_my_object_class($throwable) .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

try {
    $dummy = clone null;
} catch (Throwable $throwable) {
    $result['null'] = get_my_object_class($throwable) .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

try {
    $dummy = clone 'my string';
} catch (Throwable $throwable) {
    $result['string'] = get_my_object_class($throwable) .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/php_module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllOffsets: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();
        engine.defineNonCoercingFunction('get_my_object_class', function (objectValue) {
            return objectValue.getValue().getClassName();
        });

        expect(engine.execute().getNative()).to.deep.equal({
            'array': 'Error: __clone method called on non-object @ /my/php_module.php:7',
            'boolean': 'Error: __clone method called on non-object @ /my/php_module.php:19',
            'float': 'Error: __clone method called on non-object @ /my/php_module.php:31',
            'integer': 'Error: __clone method called on non-object @ /my/php_module.php:43',
            'null': 'Error: __clone method called on non-object @ /my/php_module.php:55',
            'string': 'Error: __clone method called on non-object @ /my/php_module.php:67'
        });
        expect(engine.getStdout().readAll()).to.equal('');
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
