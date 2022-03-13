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

describe('PHP JS<->PHP bridge JS object import synchronous mode integration', function () {
    it('should allow an imported method to return a value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return 9;
            }
        }, 'myJSObject');

        expect(engine.execute().getNative()).to.equal(30);
    });

    it('should always box an imported JS object as the same JSObject PHP class instance', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return function ($leftObject, $rightObject) {
    $result = [];

    $result['left is JSObject'] = $leftObject instanceof JSObject;
    $result['right is JSObject'] = $rightObject instanceof JSObject;
    $result['JSObjects are identical (userland)'] = $leftObject === $rightObject;

    // Make a change via one variable, ensure it is reflected via the other
    $leftObject->myCustomProp = 'my custom value';
    $result['myCustomProp from left, via right (userland)'] = $rightObject->myCustomProp;

    $result['are internal values identical'] = are_internal_values_identical($leftObject, $rightObject);

    return $result;
};
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module(),
            // Use an object with a method to avoid being coerced to an associative array
            jsObject = {myMethod: function () { return 'my value'; }};
        engine.defineNonCoercingFunction('are_internal_values_identical', function (leftReference, rightReference) {
            return leftReference.getValue() === rightReference.getValue();
        });

        expect(engine.execute().getNative()(jsObject, jsObject)).to.deep.equal({
            'left is JSObject': true,
            'right is JSObject': true,
            'JSObjects are identical (userland)': true,
            'myCustomProp from left, via right (userland)': 'my custom value',
            'are internal values identical': true
        });
    });

    it('should allow an imported method to return a value from an FFI Result synchronous handler', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return engine.createFFIResult(function () {
                    return 9;
                }, function () {
                    done(new Error('Should have been called synchronously'));
                });
            }
        }, 'myJSObject');

        expect(engine.execute().getNative()).to.equal(30);
        done();
    });

    it('should allow an imported method to throw an error', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.expose({
            myMethod: function () {
                throw new Error('Error from JS-land');
            }
        }, 'myJSObject');

        expect(function () {
            engine.execute();
        }).to.throw(Error, 'Error from JS-land');
    });

    it('should allow an imported method to throw an error from a FFI Result synchronous handler', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 21 + $myJSObject->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.expose({
            myMethod: function () {
                return engine.createFFIResult(function () {
                    throw new Error('Error from JS-land');
                }, function () {
                    done(new Error('Should have been called synchronously'));
                });
            }
        }, 'myJSObject');

        expect(function () {
            engine.execute();
        }).to.throw(Error, 'Error from JS-land');
        done();
    });
});
