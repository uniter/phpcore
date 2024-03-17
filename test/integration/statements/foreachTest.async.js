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

describe('PHP "foreach" loop statement integration (async mode)', function () {
    it('should be able to loop over a simple indexed array with pauses', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = get_async([]);

foreach (['first', get_async('second'), 'third'] as $key => $value) {
    $result[] = get_async('value for ' . get_async($key) . ' is: ' . $value);
}

return get_async($result);
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createAsyncPresentValue(value);
            };
        });

        expect((await engine.execute()).getNative()).to.deep.equal([
            'value for 0 is: first',
            'value for 1 is: second',
            'value for 2 is: third'
        ]);
    });

    it('should be able to loop over a simple associative array with pauses', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = get_async([]);

foreach (['one' => 'first', get_async('two') => get_async('second'), 'three' => 'third'] as $key => $value) {
    $result[] = get_async('value for ' . $key . ' is: ' . get_async($value));
}

return get_async($result);
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createAsyncPresentValue(value);
            };
        });

        expect((await engine.execute()).getNative()).to.deep.equal([
            'value for one is: first',
            'value for two is: second',
            'value for three is: third'
        ]);
    });

    it('should be able to loop over the visible properties of an object that does not implement Traversable with pauses', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class ParentClass {
    public $firstProp = 'one';
    public $secondProp = 'two';
    private $privateProp = 'three';
    protected $parentSharedProp = 'four';

    public function getPropsVisibleToParent() {
        $result = [];

        foreach ($this as $key => $value) {
            $result[] = get_async('value for ' . $key . ' is: ' . get_async($value) . ' - from inside ParentClass');
        }

        return get_async($result);
    }
}
class ChildClass extends ParentClass {
    private $childProp = 'five';
    protected $childSharedProp = 'six';

    public function getPropsVisibleToChild() {
        $result = [];

        foreach ($this as $key => $value) {
            $result[] = get_async('value for ' . get_async($key) . ' is: ' . $value) . ' - from inside ChildClass';
        }

        return get_async($result);
    }
}

$result = [];
$myObject = get_async(new ChildClass);

foreach (get_async($myObject) as $key => $value) {
    $result[] = 'value for ' . get_async($key) . ' is: ' . $value . ' - from outside the class';
}

$result[] = $myObject->getPropsVisibleToParent();
$result[] = get_async($myObject->getPropsVisibleToChild());

return get_async($result);
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createAsyncPresentValue(value);
            };
        });

        expect((await engine.execute()).getNative()).to.deep.equal([
            'value for firstProp is: one - from outside the class',
            'value for secondProp is: two - from outside the class',
            // Private property should not be accessible from outside the class
            [
                'value for childSharedProp is: six - from inside ParentClass',
                'value for firstProp is: one - from inside ParentClass',
                'value for secondProp is: two - from inside ParentClass',
                'value for privateProp is: three - from inside ParentClass',
                'value for parentSharedProp is: four - from inside ParentClass'
            ],
            [
                'value for childProp is: five - from inside ChildClass',
                'value for childSharedProp is: six - from inside ChildClass',
                'value for firstProp is: one - from inside ChildClass',
                'value for secondProp is: two - from inside ChildClass',
                'value for parentSharedProp is: four - from inside ChildClass'
            ]
        ]);
    });

    it('should be able to loop over an array fetched from instance property inside a closure passed as function arg with pauses', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function callIt($aFunction) {
    $aFunction();
}

callIt(get_async(function () {
    global $result;

    $myObject = get_async(new stdClass);
    $myObject->myArray = get_async(['first', 'second', 'third']);

    foreach ($myObject->myArray as $key => $value) {
        $result[] = 'value for ' . get_async(get_async($key) . ' is: ' . $value);
    }
}));

return get_async($result);
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createAsyncPresentValue(value);
            };
        });

        expect((await engine.execute()).getNative()).to.deep.equal([
            'value for 0 is: first',
            'value for 1 is: second',
            'value for 2 is: third'
        ]);
    });

    // Make sure that in order to resume iteration 21, we only resume-execute the loop body once.
    // This is achieved by resetting the opIndex counter after a loop's condition opcode
    // back to the value it had when the loop began.
    it('should not iterate in order to resume the Nth iteration', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = get_async([]);

foreach (['first', get_async('second'), 'third'] as $key => $value) {
    $result[] = get_async('value for ' . get_async($key) . ' is: ' . $value);
}

return get_async($result);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            loopConditionChecks = 0,
            environment = tools.createAsyncEnvironment({}, [
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                'get_async': function (value) {
                                    return internals.createAsyncPresentValue(value);
                                }
                            };
                        }
                    ],
                    opcodeGroups: function (internals) {
                        internals.setOpcodeFetcher('loopStructure');
                        internals.allowOpcodeOverride();

                        return {
                            // Override the standard built-in isNotFinished() opcode's handler. This opcode
                            // is used every time a foreach loop iterates, as in our test.
                            isNotFinished: function (iterator) {
                                loopConditionChecks++;

                                return internals.callPreviousHandler('isNotFinished', [iterator]);
                            }
                        };
                    }
                }
            ]),
            engine = module({}, environment);

        expect((await engine.execute()).getNative()).to.deep.equal([
            'value for 0 is: first',
            'value for 1 is: second',
            'value for 2 is: third'
        ]);
        // One condition check should occur before each of the 3 iterations,
        // with one extra check that returns false when the loop completes.
        expect(loopConditionChecks).to.equal(4);
    });
});
