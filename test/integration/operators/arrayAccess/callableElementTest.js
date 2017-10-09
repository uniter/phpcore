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

describe('PHP callable array element "[...]" integration', function () {
    it('call to callable stored as array element', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myClosure = function ($number) {
    return $number * 2;
};

$myArray = ['someKey' => $myClosure];
$myKey = 'someKey';

$result = [];
$result[] = $myArray[$myKey](21);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            42
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
