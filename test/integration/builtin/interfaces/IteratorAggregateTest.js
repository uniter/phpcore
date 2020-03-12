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

describe('PHP builtin IteratorAggregate interface integration', function () {
    it('should support iterating over an object that implements IteratorAggregate', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyCustomIterator implements Iterator
{
    private $myKeys;
    private $myValues;
    private $position = 0;

    public function __construct(array $myKeys, array $myValues) {
        $this->myKeys = $myKeys;
        $this->myValues = $myValues;
        $this->position = 0;
    }

    public function rewind() {
        $this->position = 0;
    }

    public function current() {
        return $this->myValues[$this->myKeys[$this->position]];
    }

    public function key() {
        return $this->myKeys[$this->position];
    }

    public function next() {
        ++$this->position;
    }

    public function valid() {
        return isset($this->myKeys[$this->position], $this->myValues[$this->myKeys[$this->position]]);
    }
}

class MyIteratorAggregate implements IteratorAggregate
{
    public function getIterator() {
        return new MyCustomIterator([
            'first',
            'second',
            'third'
        ], [
            'first' => 'first element',
            'second' => 'second element',
            'third' => 'last element',
        ]);
    }
}

$result = [];
$myIterator = new MyIteratorAggregate;

foreach ($myIterator as $key => $value) {
    $result[] = [$key, $value];
}

return $result;
EOS
*/;}),//jshint ignore:line,
            module = tools.syncTranspile(null, php),
            engine = module(),
            result = engine.execute();

        expect(engine.getStderr().readAll()).to.equal('');
        expect(result.getNative()).to.deep.equal([
            ['first', 'first element'],
            ['second', 'second element'],
            ['third', 'last element']
        ]);
    });

    it('should raise an Exception when ->getIterator() returns a non-traversable', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass implements IteratorAggregate
{
    public function getIterator() {
        return 21; // Not a valid iterator
    }
}

$object = new MyClass();

foreach ($object as $value) {}

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Exception: Objects returned by MyClass::getIterator() ' +
            'must be traversable or implement interface Iterator in /path/to/module.php on line 12'
        );
    });
});
