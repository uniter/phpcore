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

describe('PHP builtin Traversable interface integration', function () {
    it('should support detecting objects that implement either Iterator or IteratorAggregate', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyIterator implements Iterator {}
class MyIteratorAggregate implements IteratorAggregate {}

$myIterator = new MyIterator;
$myIteratorAggregate = new MyIteratorAggregate;

return [
    $myIterator instanceof Traversable,
    $myIteratorAggregate instanceof Traversable
];
EOS
*/;}),//jshint ignore:line,
            module = tools.syncTranspile(null, php),
            engine = module(),
            result = engine.execute();

        expect(engine.getStderr().readAll()).to.equal('');
        expect(result.getNative()).to.deep.equal([
            true,
            true
        ]);
    });
});
