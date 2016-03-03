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

describe('PHP unset(...) construct integration', function () {
    it('should correctly handle unsetting variables, elements and properties', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$aValue = 'hello';
$object = new stdClass;
$object->myProp = 'here';
$array = [21, 24];

unset($aValue);
unset($object->myProp);
unset($array[1]);

$result = [];
$result[] = isset($aValue);
$result[] = isset($object->myProp);
$result[] = isset($array[1]);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            false,
            false,
            false
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
