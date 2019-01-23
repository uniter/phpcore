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
    tools = require('./tools');

describe('PHP class shadow constructor integration', function () {
    beforeEach(function () {
        this.environment = tools.createSyncEnvironment();
    });

    describe('a non-coercing JS class', function () {
        beforeEach(function () {
            this.environment.defineClass('MyClass', function (internals) {
                function MyClass() {
                }

                MyClass.shadowConstructor = function () {
                    this.setInternalProperty('secret', internals.valueFactory.createInteger(27));
                };

                MyClass.prototype.getSecret = function () {
                    return this.getInternalProperty('secret');
                };

                internals.disableAutoCoercion();

                return MyClass;
            });
        });

        it('should call the shadow constructor of JS class when not extended', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new MyClass();

return $myObject->getSecret();

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);

            expect(module({}, this.environment).execute().getNative()).to.equal(27);
        });

        it('should call the shadow constructor of JS class when extended from PHP-land but constructor is not overridden', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyDerivedClass extends MyClass
{
}

$myObject = new MyDerivedClass();

return $myObject->getSecret();

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);

            expect(module({}, this.environment).execute().getNative()).to.equal(27);
        });

        it('should call the shadow constructor of JS class when extended from JS-land but constructor is not overridden', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new MyDerivedClass();

return $myObject->getSecret();

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);
            this.environment.defineClass('MyDerivedClass', function (internals) {
                function MyDerivedClass() {
                }

                internals.extendClass('MyClass');

                internals.disableAutoCoercion();

                return MyDerivedClass;
            });

            expect(module({}, this.environment).execute().getNative()).to.equal(27);
        });

        it('should still call the shadow constructor of JS class when extended from PHP-land and constructor is overridden', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyDerivedClass extends MyClass
{
    public function __construct()
    {
        // No parent constructor call here - should still call the shadow constructor though
    }
}

$myObject = new MyDerivedClass();

return $myObject->getSecret();

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);

            expect(module({}, this.environment).execute().getNative()).to.equal(27);
        });

        it('should still call the shadow constructor of JS class when extended from JS-land and constructor is overridden', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new MyDerivedClass();

return $myObject->getSecret();

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);
            this.environment.defineClass('MyDerivedClass', function (internals) {
                function MyDerivedClass() {
                }

                MyDerivedClass.prototype.__construct = function () {
                    // No parent constructor call here - should still call the shadow constructor though
                };

                internals.extendClass('MyClass');

                internals.disableAutoCoercion();

                return MyDerivedClass;
            });

            expect(module({}, this.environment).execute().getNative()).to.equal(27);
        });
    });

    describe('an auto-coercing JS class', function () {
        beforeEach(function () {
            this.environment.defineClass('MyClass', function () {
                function MyClass() {
                }

                MyClass.shadowConstructor = function () {
                    this.value = 101;
                };

                MyClass.prototype.getSecret = function () {
                    return this.value;
                };

                return MyClass;
            });
        });

        it('should call the shadow constructor of JS class when not extended', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new MyClass();

return $myObject->getSecret();

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);

            expect(module({}, this.environment).execute().getNative()).to.equal(101);
        });

        it('should call the shadow constructor of JS class when extended from PHP-land but constructor is not overridden', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyDerivedClass extends MyClass
{
}

$myObject = new MyDerivedClass();

return $myObject->getSecret();

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);

            expect(module({}, this.environment).execute().getNative()).to.equal(101);
        });

        it('should call the shadow constructor of JS class when extended from JS-land but constructor is not overridden', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new MyDerivedClass();

return $myObject->getSecret();

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);
            this.environment.defineClass('MyDerivedClass', function (internals) {
                function MyDerivedClass() {
                }

                internals.extendClass('MyClass');

                internals.disableAutoCoercion();

                return MyDerivedClass;
            });

            expect(module({}, this.environment).execute().getNative()).to.equal(101);
        });

        it('should still call the shadow constructor of JS class when extended from PHP-land and constructor is overridden', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyDerivedClass extends MyClass
{
    public function __construct()
    {
        // No parent constructor call here - should still call the shadow constructor though
    }
}

$myObject = new MyDerivedClass();

return $myObject->getSecret();

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);

            expect(module({}, this.environment).execute().getNative()).to.equal(101);
        });

        it('should still call the shadow constructor of JS class when extended from JS-land and constructor is overridden', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new MyDerivedClass();

return $myObject->getSecret();

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);
            this.environment.defineClass('MyDerivedClass', function (internals) {
                function MyDerivedClass() {
                }

                MyDerivedClass.prototype.__construct = function () {
                    // No parent constructor call here - should still call the shadow constructor though
                };

                internals.extendClass('MyClass');

                internals.disableAutoCoercion();

                return MyDerivedClass;
            });

            expect(module({}, this.environment).execute().getNative()).to.equal(101);
        });
    });
});
