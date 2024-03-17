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
    tools = require('../../../tools');

describe('PHP class statement destructor integration', function () {
    describe('simple non-cyclical values', function () {
        it('should call a destructor when an instance is assigned to a variable followed by null', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public function __destruct()
    {
        global $result;

        $result[] = get_async('from destructor');
    }
}

$result = [];

$result[] = 'first';
$myObject = new MyClass;
$result[] = 'second';
$result[] = gc_collect_cycles();
$result[] = 'third';
$myObject = null;
$result[] = gc_collect_cycles();

// Ensure that the nulling-out of $myObject is not affected.
$result[] = '$myObject is null?: ' . ($myObject === null ? 'yes' : 'no');

// Ensure that subsequent GCs do not invoke the destructor again.
$result[] = gc_collect_cycles();

$result[] = 'fourth';

return $result;
EOS
*/;}), //jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module({garbageCollection: true});
            engine.defineNonCoercingFunction('get_async', function (value) {
                return this.createAsyncPresentValue(value);
            });

            expect((await engine.execute()).getNative()).to.deep.equal([
                'first',
                'second',
                0,
                'third',
                'from destructor',
                1, // This is the result of the gc_collect_cycles() call that collected the object.
                '$myObject is null?: yes',
                0, // Object should not be collected again.
                'fourth'
            ]);
        });

        it('should call a destructor when an instance is never assigned to anything', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public function __destruct()
    {
        global $result;

        $result[] = get_async('from destructor');
    }
}

$result = [];

$result[] = 'first';
$result[] = gc_collect_cycles();
$result[] = 'second';
new MyClass;
$result[] = gc_collect_cycles();
$result[] = 'third';
$result[] = gc_collect_cycles(); // A second call, just to ensure the value is not GC'd again.
$result[] = 'fourth';

return $result;
EOS
*/;}), //jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module({garbageCollection: true});
            engine.defineNonCoercingFunction('get_async', function (value) {
                return this.createAsyncPresentValue(value);
            });

            expect((await engine.execute()).getNative()).to.deep.equal([
                'first',
                0,
                'second',
                'from destructor',
                1, // This is the result of the gc_collect_cycles() call that collected the object.
                'third',
                0, // Object should not be collected again.
                'fourth'
            ]);
        });
    });

    it('should not call a destructor when garbage collection is not enabled', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public function __destruct()
    {
        global $result;

        $result[] = get_async('from destructor');
    }
}

$result = [];

$result[] = 'first';
$myObject = new MyClass;
$result[] = 'second';
$result[] = gc_collect_cycles();
$result[] = 'third';
$myObject = null;
$result[] = gc_collect_cycles();

// Ensure that the nulling-out of $myObject is not affected.
$result[] = '$myObject is null?: ' . ($myObject === null ? 'yes' : 'no');

// Ensure that subsequent GCs do not invoke the destructor again.
$result[] = gc_collect_cycles();

$result[] = 'fourth';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(/* garbageCollection not enabled */);
        engine.defineNonCoercingFunction('get_async', function (value) {
            return this.createAsyncPresentValue(value);
        });

        expect((await engine.execute()).getNative()).to.deep.equal([
            'first',
            'second',
            0, // 0 will be returned if collection is disabled.
            'third',
            0,
            '$myObject is null?: yes',
            0,
            'fourth'
        ]);
    });
});
