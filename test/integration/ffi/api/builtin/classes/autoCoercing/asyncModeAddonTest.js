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
    tools = require('../../../../../tools'),
    when = require('../../../../../../when'),
    Promise = require('lie');

describe('PHP builtin FFI class asynchronous mode addon auto-coercion integration', function () {
    it('should support installing a custom class using the "classes" property', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new AwesomeClass();

return $myObject->getIt();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({}, [
                {
                    classes: {
                        'AwesomeClass': function () {
                            function AwesomeClass() {}

                            AwesomeClass.prototype.getIt = function () {
                                return 21;
                            };

                            return AwesomeClass;
                        }
                    }
                }
            ]);

        module({}, environment).execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(21);
        }), done);
    });

    it('should support installing an auto-coercing custom class using the "classGroups" property whose method returns a primitive value', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new AwesomeClass();

return $myObject->getIt();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({}, [
                {
                    classGroups: [
                        function () {
                            return {
                                'AwesomeClass': function () {
                                    function AwesomeClass() {}

                                    AwesomeClass.prototype.getIt = function () {
                                        return 21;
                                    };

                                    return AwesomeClass;
                                }
                            };
                        }
                    ]
                }
            ]);

        module({}, environment).execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(21);
        }), done);
    });

    it('should await Promises returned from auto-coercing custom class methods', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new AwesomeClass();

return $myObject->getIt();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({}, [
                {
                    classGroups: [
                        function () {
                            return {
                                'AwesomeClass': function () {
                                    function AwesomeClass() {}

                                    AwesomeClass.prototype.getIt = function () {
                                        return new Promise(function (resolve) {
                                            setTimeout(function () {
                                                resolve(21);
                                            }, 10);
                                        });
                                    };

                                    return AwesomeClass;
                                }
                            };
                        }
                    ]
                }
            ]),
            result = await module({}, environment).execute();

        expect(result.getType()).to.equal('int');
        expect(result.getNative()).to.equal(21);
    });

    it('should support installing an auto-coercing custom class using the "classGroups" property whose method returns an FFI result returning a Promise that resolves to a primitive value', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new AwesomeClass();

return $myObject->getIt() + 100;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({}, [
                {
                    classGroups: [
                        function (internals) {
                            return {
                                'AwesomeClass': function () {
                                    function AwesomeClass() {}

                                    AwesomeClass.prototype.getIt = function () {
                                        return internals.createFFIResult(function () {
                                            done(new Error('Sync callback should not have been called'));
                                        }, function () {
                                            return Promise.resolve(21);
                                        });
                                    };

                                    return AwesomeClass;
                                }
                            };
                        }
                    ]
                }
            ]);

        module({}, environment).execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(121);
        }), done);
    });

    it('should support installing custom classes with unwrappers', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myCoercingObject = new CoercingClass(27);
$myNonCoercingObject = new NonCoercingClass(21);

return [$myCoercingObject, $myNonCoercingObject];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({}, [
                {
                    classes: {
                        'CoercingClass': function (internals) {
                            function CoercingClass(myNumber) {
                                this.myNumber = myNumber;
                            }

                            internals.defineUnwrapper(function () {
                                return this.myNumber + 3;
                            });

                            return CoercingClass;
                        },
                        'NonCoercingClass': function (internals) {
                            function NonCoercingClass(myNumberValue) {
                                this.setProperty('myNumber', myNumberValue);
                            }

                            internals.defineUnwrapper(function () {
                                return this.getProperty('myNumber').getNative() * 2;
                            });

                            internals.disableAutoCoercion();

                            return NonCoercingClass;
                        }
                    }
                }
            ]);

        module({}, environment).execute().then(when(done, function (result) {
            expect(result.getNative()).to.deep.equal([30, 42]);
        }), done);
    });

    it('should support installing a custom class into a namespace', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new My\Stuff\AwesomeClass();

return $myObject->getIt();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({}, [
                {
                    classes: {
                        'My\\Stuff\\AwesomeClass': function () {
                            function AwesomeClass() {}

                            AwesomeClass.prototype.getIt = function () {
                                return 21;
                            };

                            return AwesomeClass;
                        }
                    }
                }
            ]);

        module({}, environment).execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(21);
        }), done);
    });
});
