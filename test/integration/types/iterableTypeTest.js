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
    tools = require('../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP "iterable" type integration', function () {
    var doRun,
        outputLog;

    beforeEach(function () {
        outputLog = [];
        doRun = function (engine) {
            // Capture the standard streams, prefixing each write with its name
            // so that we can ensure that what is written to each of them is in the correct order
            // with respect to one another
            engine.getStdout().on('data', function (data) {
                outputLog.push('[stdout]' + data);
            });
            engine.getStderr().on('data', function (data) {
                outputLog.push('[stderr]' + data);
            });

            return engine.execute();
        };
    });

    it('should allow passing valid iterables for function parameters typed as "iterable"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function mySummer(iterable $myData) {
    $sum = 0;

    foreach ($myData as $myItem) {
        $sum += $myItem;
    }

    return $sum;
}

$result['array'] = mySummer([21, 100]);

class MyCustomIterator implements Iterator
{
    private $myValues;
    private $position = 0;

    public function __construct($myValues) {
        $this->myValues = $myValues;
    }

    public function rewind() {
        $this->position = 0;
    }

    public function current() {
        return $this->myValues[$this->position];
    }

    public function key() {
        return $this->position;
    }

    public function next() {
        ++$this->position;
    }

    public function valid() {
        return isset($this->myValues[$this->position]);
    }
}

$result['traversable'] = mySummer(new MyCustomIterator([1000, 42]));

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'array': 121,
            'traversable': 1042
        });
    });

    it('should allow passing null for function parameters typed as "iterable" with default null', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function myFunction(iterable $myIterable = null) {
    return $myIterable ?
        'an iterable was given' :
        'cannot iterate (it was omitted)';
}

// Omit the $myIterable argument
$result['omitted'] = myFunction();

$result['explicit null'] = myFunction(null);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'omitted': 'cannot iterate (it was omitted)',
            'explicit null': 'cannot iterate (it was omitted)'
        });
    });

    it('should raise an error when an iterable-type parameter is given an invalid iterable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --

function myFunction(iterable $myIterable) {
    foreach ($myIterable as $myItem) {
        print $myItem;
    }
}

// Strings are not valid iterables
myFunction('I_am_not_a_valid_iterable');
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        await expect(doRun(engine)).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myIterable) must be of type iterable, ' +
            'string given, called in /path/to/module.php on line 12 and defined in /path/to/module.php:5' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr
            ' in /path/to/module.php on line 5'
        );
        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught TypeError: myFunction(): Argument #1 ($myIterable) must be of type iterable, string given, called in /path/to/module.php on line 12 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(12): myFunction('I_am_not_a_vali...')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message
            nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myIterable) must be of type iterable, string given, called in /path/to/module.php on line 12 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(12): myFunction('I_am_not_a_vali...')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
        ]);
    });
});
