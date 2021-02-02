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
    tools = require('../../../../../tools');

describe('PHP builtin FFI class synchronous mode addon auto-coercion integration', function () {
    it('should define classes from the "classGroups" property in sequence to support dependencies', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new SecondClass(5);

return [
    $myObject->getFirst(),
    $myObject->getSecond()
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            environment = tools.createSyncEnvironment({}, [
                {
                    classGroups: [
                        function () {
                            return {
                                'FirstClass': function () {
                                    function FirstClass(toAdd) {
                                        this.toAdd = toAdd;
                                    }

                                    FirstClass.prototype.getFirst = function () {
                                        return 21 + this.toAdd;
                                    };

                                    return FirstClass;
                                }
                            };
                        },
                        function () {
                            return {
                                'SecondClass': function (internals) {
                                    function SecondClass() {
                                        internals.callSuperConstructor(this, arguments);
                                    }

                                    internals.extendClass('FirstClass');

                                    SecondClass.prototype.getSecond = function () {
                                        return 1001 + this.toAdd;
                                    };

                                    return SecondClass;
                                }
                            };
                        }
                    ]
                }
            ]);

        expect(module({}, environment).execute().getNative()).to.deep.equal([26, 1006]);
    });

    it('should use an unwrapper defined for the class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new MyClass();

return [
    'myObject' => $myObject
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            environment = tools.createSyncEnvironment({}, [
                {
                    classGroups: [
                        function () {
                            return {
                                'MyClass': function (internals) {
                                    function MyClass() {
                                    }

                                    internals.defineUnwrapper(function () {
                                        return {my: 'unwrapped value'};
                                    });

                                    return MyClass;
                                }
                            };
                        }
                    ]
                }
            ]);

        expect(module({}, environment).execute().getNative()).to.deep.equal({
            myObject: {
                my: 'unwrapped value'
            }
        });
    });

    it('should inherit the unwrapper from an ancestor', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new MyChildClass();

return [
    'myObject' => $myObject
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            environment = tools.createSyncEnvironment({}, [
                {
                    classGroups: [
                        function () {
                            return {
                                'MyParentClass': function (internals) {
                                    function MyParentClass() {
                                    }

                                    internals.defineUnwrapper(function () {
                                        return {my: 'unwrapped value from parent'};
                                    });

                                    return MyParentClass;
                                }
                            };
                        },
                        function () {
                            return {
                                'MyChildClass': function (internals) {
                                    function MyChildClass() {
                                    }

                                    internals.extendClass('MyParentClass');

                                    return MyChildClass;
                                }
                            };
                        }
                    ]
                }
            ]);

        expect(module({}, environment).execute().getNative()).to.deep.equal({
            myObject: {
                my: 'unwrapped value from parent'
            }
        });
    });
});
