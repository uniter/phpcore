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

describe('PHP string interpolation construct integration', function () {
    it('should correctly handle interpolating variables, elements and properties in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$aValue = 'hello';
$object = new stdClass;
$object->myProp = 'here';
$array = [21, 24];

$result = [];
$result['all together'] = "My string with $aValue, $object->myProp and $array[1] all together";
$result['with invalid sequences'] = "My string with $12_NotAValidVar, $4object->notAValidProp and $7array[notAValidElement]!";

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'all together': 'My string with hello, here and 24 all together',
            'with invalid sequences': 'My string with $12_NotAValidVar, $4object->notAValidProp and $7array[notAValidElement]!'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle interpolation with references to pausing accessor variables', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$result['one pausing reference'] = "My string with only $firstAccessorGlobal";
$result['both pausing references'] = "My string with both $firstAccessorGlobal and $secondAccessorGlobal!";

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'firstAccessorGlobal',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve('My first var');
                    });
                });
            }
        );
        engine.defineGlobalAccessor(
            'secondAccessorGlobal',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve('My second var');
                    });
                });
            }
        );

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal({
                'one pausing reference': 'My string with only My first var',
                'both pausing references': 'My string with both My first var and My second var!'
            });
            expect(engine.getStderr().readAll()).to.equal('');
        });
    });
});
