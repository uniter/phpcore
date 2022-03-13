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

describe('PHP builtin Iterator interface integration', function () {
    it('should support iterating over an object that implements Iterator', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyCustomIterator implements Iterator
{
    private $myKeys = [
        'first',
        'second',
        'third'
    ];
    private $myValues = [
        'first' => 'first element',
        'second' => 'second element',
        'third' => 'last element',
    ];
    private $position = 0;

    public function __construct() {
        $this->position = 0;
    }

    public function rewind() {
        $GLOBALS['result'][] = __METHOD__;
        $this->position = 0;
    }

    public function current() {
        $GLOBALS['result'][] = __METHOD__;
        return $this->myValues[$this->myKeys[$this->position]];
    }

    public function key() {
        $GLOBALS['result'][] = __METHOD__;
        return $this->myKeys[$this->position];
    }

    public function next() {
        $GLOBALS['result'][] = __METHOD__;
        ++$this->position;
    }

    public function valid() {
        $GLOBALS['result'][] = __METHOD__;
        return isset($this->myKeys[$this->position], $this->myValues[$this->myKeys[$this->position]]);
    }
}

$result = [];
$myIterator = new MyCustomIterator;

foreach ($myIterator as $key => $value) {
    $result[] = [$key, $value];
}

return $result;
EOS
*/;}),//jshint ignore:line,
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module(),
            result = engine.execute();

        expect(engine.getStderr().readAll()).to.equal('');
        expect(result.getNative()).to.deep.equal([
            'MyCustomIterator::rewind',

            'MyCustomIterator::valid',
            'MyCustomIterator::current',
            'MyCustomIterator::key',
            ['first', 'first element'],
            'MyCustomIterator::next',

            'MyCustomIterator::valid',
            'MyCustomIterator::current',
            'MyCustomIterator::key',
            ['second', 'second element'],
            'MyCustomIterator::next',

            'MyCustomIterator::valid',
            'MyCustomIterator::current',
            'MyCustomIterator::key',
            ['third', 'last element'],
            'MyCustomIterator::next',

            'MyCustomIterator::valid'
        ]);
    });

    it('should support a pause from ->next() method in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyCustomIterator implements Iterator
{
    private $myKeys = [
        'first',
        'second',
        'third'
    ];
    private $myValues = [
        'first' => 'first element',
        'second' => 'second element',
        'third' => 'last element',
    ];
    private $position = 0;

    public function __construct() {
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
        $GLOBALS['result'][] = get_async(__METHOD__); // Invoke a pause from ->next(), which is called internally.
        ++$this->position;
    }

    public function valid() {
        return isset($this->myKeys[$this->position], $this->myValues[$this->myKeys[$this->position]]);
    }
}

$result = [];
$myIterator = new MyCustomIterator;

foreach ($myIterator as $key => $value) {
    $result[] = [$key, $value];
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(value);
                    });
                });
            };
        });

        expect((await engine.execute()).getNative()).to.deep.equal([
            ['first', 'first element'],
            'MyCustomIterator::next',
            ['second', 'second element'],
            'MyCustomIterator::next',
            ['third', 'last element'],
            'MyCustomIterator::next',
        ]);
    });
});
