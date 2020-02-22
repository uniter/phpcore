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

describe('PHP builtin JSObject class integration', function () {
    it('should be able to fetch the properties of a JS object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = $myJSObject instanceof JSObject;
$result[] = $myJSObject->propWithNumber;
$result[] = $myJSObject->propWithString;
$result[] = $myJSObject->propWithBoolean;
$result[] = $myJSObject->propWithNestedJSObject->subNumberProp;

return $result;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/test/module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllBounds: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        // Use Object.create(...) so that the object is not seen as a POJO and casted to an assoc. array
        engine.defineGlobal('myJSObject', Object.create({
            propWithNumber: 21,
            propWithString: 'a string',
            propWithBoolean: true,
            propWithNestedJSObject: Object.create({
                subNumberProp: 1001
            })
        }));

        expect(engine.execute().getNative()).to.deep.equal([
            true, // Check for instance of JSObject
            21,
            'a string',
            true,
            1001
        ]);
    });

    it('should fetch object properties from the eventual object, to ensure accessors get the correct context object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = $myJSObject instanceof JSObject;
$result[] = $myJSObject->accessorProperty;

return $result;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/test/module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllBounds: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module(),
            prototypeObject = Object.create({}, {
                shadowedProperty: {
                    writable: true, // Allow this property to be shadowed
                    value: 21
                },
                accessorProperty: {
                    get: function () {
                        return this.shadowedProperty;
                    }
                }
            }),
            // Use Object.create(...) so that the object is not seen as a POJO and casted to an assoc. array
            derivedObject = Object.create(prototypeObject);
        derivedObject.shadowedProperty = 1001; // Shadow the property on the prototype

        engine.defineGlobal('myJSObject', derivedObject);

        expect(engine.execute().getNative()).to.deep.equal([
            true,
            1001 // The shadowing property on the derived object should be read, not the shadowed one on the prototype
        ]);
    });

    it('should fetch null for undefined properties on the JS object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = $myJSObject instanceof JSObject;
$result[] = $myJSObject->anUndefinedProperty;
$result[] = $myJSObject->aDefinedPropertyWithValueUndefined;

return $result;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/test/module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllBounds: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        // Use Object.create(...) so that the object is not seen as a POJO and casted to an assoc. array
        engine.defineGlobal('myJSObject', Object.create({
            aDefinedPropertyWithValueUndefined: undefined
        }));

        expect(engine.execute().getNative()).to.deep.equal([
            true,
            null, // Undefined properties should be fetched as NULL
            null  // Defined properties with the value undefined should also be fetched as NULL
        ]);
    });

    it('should be able to set the properties of a JS object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myJSObject->myNewProp = 21; // Assign a new property
$myJSObject->myShadowedProp = 1001; // Assign a new own property that will shadow the one on the prototype

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/test/module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllBounds: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module(),
            prototypeObject = {
                myShadowedProp: 21
            },
            // Use Object.create(...) so that the object is not seen as a POJO and casted to an assoc. array
            derivedObject = Object.create(prototypeObject);

        engine.defineGlobal('myJSObject', derivedObject);

        engine.execute();

        expect(derivedObject.myNewProp).to.equal(21);        // Check the new property was defined
        expect(derivedObject.myShadowedProp).to.equal(1001); // Check the new shadowing own property was defined
        expect(prototypeObject.myShadowedProp).to.equal(21); // Check the prototype's shadowed property was left untouched
    });

    it('should be able to unset/delete the own properties of a JS object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

unset($myJSObject->myProp);

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/test/module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllBounds: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module(),
            // Use Object.create(...) so that the object is not seen as a POJO and casted to an assoc. array
            derivedObject = Object.create({});

        derivedObject.myProp = 21;
        engine.defineGlobal('myJSObject', derivedObject);

        engine.execute();

        expect(derivedObject).not.to.have.property('myProp');
    });

    it('should be able to call a method of a JS object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = $myJSObject instanceof JSObject;
$result[] = $myJSObject->myMethod();

return $result;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/test/module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllBounds: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        // Use Object.create(...) so that the object is not seen as a POJO and casted to an assoc. array
        engine.defineGlobal('myJSObject', Object.create({
            myMethod: function () {
                return 'my result';
            }
        }));

        expect(engine.execute().getNative()).to.deep.equal([
            true, // Check for instance of JSObject
            'my result'
        ]);
    });

    it('should look for JS object methods case-sensitively', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = $myJSObject instanceof JSObject;
$result[] = $myJSObject->myMethod();

return $result;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/test/module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllBounds: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        // This object has methods, so will not be seen as a POJO and casted to an assoc. array
        engine.defineGlobal('myJSObject', {
            mYMeTHod: function () {
                return 'the wrong result';
            },
            myMethod: function () {
                return 'the right result';
            }
        });

        expect(engine.execute().getNative()).to.deep.equal([
            true, // Check for instance of JSObject
            'the right result'
        ]);
    });

    it('should raise a "Call to undefined method ..." error when a JS object method is not defined', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myJSObject->myUndefinedMethod();
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/test/module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllBounds: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        // This object has methods, so will not be seen as a POJO and casted to an assoc. array
        engine.defineGlobal('myJSObject', {
            someMethod: function () {
                return 'the wrong result';
            }
        });

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Call to undefined method JSObject::myUndefinedMethod() in /my/test/module.php on line 3'
        );
    });

    it('should allow JS functions wrapped as JSObjects to be called', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = $myJSFunction instanceof JSObject;
$result[] = $myJSFunction('world');

return $result;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/test/module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllBounds: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        engine.defineGlobal('myJSFunction', function (arg) {
            return 'hello ' + arg;
        });

        expect(engine.execute().getNative()).to.deep.equal([
            true, // Check for instance of JSObject
            'hello world'
        ]);
    });
});
