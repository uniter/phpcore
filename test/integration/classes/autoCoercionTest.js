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

describe('PHP class auto-coercion integration', function () {
    it('should correctly handle a single auto-coercing class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new MyClass(1001, 'my string');

$result = [];
$result[] = $myObject->multiplyNumberBy(2);
$result[] = $myObject->getString();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.defineClass('MyClass', function () {
            function MyClass(myNumber, myString) {
                this.myNumber = myNumber;
                this.myString = myString;
            }

            MyClass.prototype.getString = function () {
                return this.myString;
            };

            MyClass.prototype.multiplyNumberBy = function (myMultiplier) {
                return this.myNumber * myMultiplier;
            };

            return MyClass;
        });

        expect(engine.execute().getNative()).to.deep.equal([
            2002,
            'my string'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle passing instances of an auto-coercing class to another', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$concatenator = new Concatenator(', and: ');
$stringA = new StringEncapsulator('my first string');
$stringB = new StringEncapsulator('my second string');

$result = [];
$result[] = $concatenator->concatenate($stringA, $stringB);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.defineClass('StringEncapsulator', function () {
            function StringEncapsulator(myString) {
                this.myString = myString;
            }

            StringEncapsulator.prototype.getString = function () {
                return this.myString;
            };

            return StringEncapsulator;
        });

        engine.defineClass('Concatenator', function () {
            function Concatenator(delimiter) {
                this.delimiter = delimiter;
            }

            Concatenator.prototype.concatenate = function (encapsulatedStringA, encapsulatedStringB) {
                return [encapsulatedStringA.getString(), encapsulatedStringB.getString()].join(this.delimiter);
            };

            return Concatenator;
        });

        expect(engine.execute().getNative()).to.deep.equal([
            'my first string, and: my second string'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should make the underlying native object of an auto-coercing class exposed to JS-land extend the native class', function () {
        function MyClass(myArg) {
            this.myArg = myArg;
        }

        MyClass.prototype.appendSomething = function (what) {
            this.myArg += ' ' + what;
        };

        var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new MyClass('my value');
$myObject->appendSomething('[from PHP]');

return $myObject;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module(),
            nativeObject;
        engine.defineClass('MyClass', function (/* internals */) {
            // TODO: Support this (see below)
            // internals.exposeProperty('myArg');

            return MyClass;
        });

        nativeObject = engine.execute().getNative();
        nativeObject.appendSomething('[from JS]');

        expect(nativeObject).to.be.an.instanceOf(MyClass);
        // TODO: Implement internals.exposeProperty(...) to allow the below
        // expect(nativeObject.myArg).to.equal('my value [from PHP] [from JS]');
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should always treat the exposed native object of an auto-coercing class as identical to itself', function () {
        function MyClass(myArg) {
            this.myArg = myArg;
        }

        var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new MyClass('my value');

return [
    'strictlyCompare' => function ($object1, $object2) {
        return $object1 === $object2;
    },
    'myObject' => $myObject
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module(),
            result;
        engine.defineClass('MyClass', function () {
            return MyClass;
        });

        result = engine.execute().getNative();

        /*
        // Pass the unwrapped auto-coercing class' instance back twice, where we will
        // perform a strict PHP comparison, to ensure the exposed native object is always
        // considered identical to itself.
        // Ideally we would be checking that it is always mapped back to the same ObjectValue
        // instance to ensure we don't waste memory, but that cannot be tested from here
        // as the identity check is done on the native object anyway.
         */
        expect(result.strictlyCompare(result.myObject, result.myObject)).to.be.true;
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support an auto-coercing class extending another', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new MyChildClass('[from PHP]');

$result = [];
$result[] = $myObject->getString();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.defineClass('MyParentClass', function () {
            function MyParentClass(myString) {
                this.myString = myString + ' [from parent ctor]';
            }

            return MyParentClass;
        });
        engine.defineClass('MyChildClass', function (internals) {
            function MyChildClass(myString) {
                internals.callSuperConstructor(this, [myString + ' [from child ctor]']);
            }

            internals.extendClass('MyParentClass');

            MyChildClass.prototype.getString = function () {
                return this.myString;
            };

            return MyChildClass;
        });

        expect(engine.execute().getNative()).to.deep.equal([
            '[from PHP] [from child ctor] [from parent ctor]'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support an auto-coercing class extending a non-coercing class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new MyChildClass('[from PHP]');

$result = [];
$result[] = $myObject->getString();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.defineClass('MyParentClass', function (internals) {
            function MyParentClass(myStringReference) {
                this.setProperty(
                    'myString',
                    myStringReference.getValue().concat(
                        internals.valueFactory.createString(' [from parent ctor]')
                    )
                );
            }

            internals.disableAutoCoercion();

            return MyParentClass;
        });
        engine.defineClass('MyChildClass', function (internals) {
            function MyChildClass(myString) {
                internals.callSuperConstructor(this, [myString + ' [from child ctor]']);
            }

            internals.extendClass('MyParentClass');

            MyChildClass.prototype.getString = function () {
                return this.myString;
            };

            return MyChildClass;
        });

        expect(engine.execute().getNative()).to.deep.equal([
            '[from PHP] [from child ctor] [from parent ctor]'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
