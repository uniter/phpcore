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

describe('PHP class instance property overloading integration', function () {
    it('should use the magic __get(...) method when the property is not defined', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public function aMethod() {}

    public function __get($name)
    {
        return 'prop: ' . $name;
    }
}

$object = new MyClass;

return $object->myUndefinedProp;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal('prop: myUndefinedProp');
    });

    it('should use the magic __get(...) method defined by a derived JS class when the property is not defined', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$object = new MyChildClass;

return $object->myUndefinedProp;
EOS
*/;}),//jshint ignore:line
            environment = tools.createAsyncEnvironment({}, [
                {
                    classGroups: [
                        function () {
                            return {
                                MyParentClass: function () {
                                    function MyParentClass() {}

                                    return MyParentClass;
                                }
                            };
                        },
                        function () {
                            return {
                                MyChildClass: function (internals) {
                                    function MyChildClass() {}

                                    internals.extendClass('MyParentClass');

                                    MyChildClass.prototype.__get = function (propertyName) {
                                        return 'prop: ' + propertyName;
                                    };

                                    return MyChildClass;
                                }
                            };
                        }
                    ]
                }
            ]),
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module({}, environment);

        expect((await engine.execute()).getNative()).to.equal('prop: myUndefinedProp');
    });

    it('should invoke the magic __get(...) method at the time the argument is evaluated', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

class MyClass
{
    private $myProp = 'initial';

    public function __get($name)
    {
        global $result;

        $result[] = "[Fetching value of property '$name']";

        return $this->myProp;
    }

    public function __set($name, $value)
    {
        global $result;

        $result[] = "[Setting value of property '$name' to '$value']";

        $this->myProp = $value;
    }
}

$object = new MyClass;
$yourVar = 'final';

function myFunc($first, $second)
{
    return "myFunc('$first', '$second')";
}

$result[] = myFunc($object->myDynamicProp, ${($object->myDynamicProp = 'assigned') && false ?: 'yourVar'});

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            '[Fetching value of property \'myDynamicProp\']',
            '[Setting value of property \'myDynamicProp\' to \'assigned\']',
            'myFunc(\'initial\', \'final\')'
        ]);
    });

    it('should not invoke the magic __get(...) method when assigning', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

class MyClass
{
    private $myProp = 'initial';

    public function __get($name)
    {
        global $result;

        $result[] = "[Fetching value of property '$name']";

        return $this->myProp;
    }

    public function __set($name, $value)
    {
        global $result;

        $result[] = "[Setting value of property '$name' to '$value']";

        $this->myProp = $value;
    }
}

$object = new MyClass;

$object->myDynamicProp = 'my value';
$result[] = 'myDynamicProp: ' . $object->myDynamicProp;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            '[Setting value of property \'myDynamicProp\' to \'my value\']',
            '[Fetching value of property \'myDynamicProp\']',
            'myDynamicProp: my value'
        ]);
    });
});
