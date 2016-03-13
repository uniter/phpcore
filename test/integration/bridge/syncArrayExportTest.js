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
    phpCore = require('../../../sync'),
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs');

describe('PHP JS<->PHP bridge array export synchronous mode integration', function () {
    it('should be able to pass an array from JS->PHP->JS->PHP->JS with modifications', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myArray['php_prop'] = 27;
$passBackToJS($myArray, function (array $myArrayAgain, $callback) {
    $myArrayAgain['another_php_prop'] = 'yep';

    $callback($myArrayAgain);
});

EOS
*/;}), //jshint ignore:line
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return phpCore;
            }),
            phpEngine = module(),
            myResult = null;

        phpEngine.expose(function (myArray, callback) {
            myArray.added_by_js = 'added by JS';
            callback(myArray, function (myArrayAgain) {
                myResult = myArrayAgain;
            });
        }, 'passBackToJS');
        phpEngine.expose(['hello', 21], 'myArray');

        phpEngine.execute();

        expect(myResult).to.be.an('object');
        expect(myResult).not.to.be.an('array');
        expect(myResult).to.deep.equal({
            '0': 'hello',
            '1': 21,
            'php_prop': 27,
            'added_by_js': 'added by JS',
            'another_php_prop': 'yep'
        });
    });
});
