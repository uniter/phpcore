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
    it('should use the magic __get(...) method when the property is not defined', function () {
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
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal('prop: myUndefinedProp');
    });

    it('should use the magic __get(...) method defined by a derived JS class when the property is not defined', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$object = new MyChildClass;

return $object->myUndefinedProp;
EOS
*/;}),//jshint ignore:line
            runtime = tools.createSyncRuntime(),
            module = tools.transpile(runtime, null, php);

        runtime.install({
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
        });

        expect(module().execute().getNative()).to.equal('prop: myUndefinedProp');
    });
});
