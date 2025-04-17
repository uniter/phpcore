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
    tools = require('../../../../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

// See https://wiki.php.net/rfc/deprecate_null_to_scalar_internal_arg.
describe('PHP builtin FFI function non-coercion deprecated coercion of null for non-nullable parameters integration', function () {
    it('should raise a deprecation notice when null is passed to a non-nullable parameter of builtin function', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

$result['with null'] = do_something(null);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction(
            'do_something',
            function (myParamValue) {
                return myParamValue.getNative().length;
            },
            'string $myParam : int'
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with null': 0
        });
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Deprecated:  do_something(): Passing null to parameter #1 ($myParam) of type string is deprecated in /path/to/my_module.php on line 6

EOS
*/;} //jshint ignore:line
        ));
        // NB: Stdout should have a leading newline written out just before the message.
        expect(engine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS

Deprecated: do_something(): Passing null to parameter #1 ($myParam) of type string is deprecated in /path/to/my_module.php on line 6

EOS
*/;} //jshint ignore:line
        ));
    });

    it('should raise a deprecation notice when null is passed to a non-nullable union type parameter of builtin function', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

$result['with null'] = do_something(null);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction(
            'do_something',
            function (myParamValue) {
                return 'type: ' + myParamValue.getType() + ', value: ' + myParamValue.getNative();
            },
            'MyClass|int $myParam : string'
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with null': 'type: int, value: 0' // Null is coerced to 0 following the deprecated behaviour.
        });
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Deprecated:  do_something(): Passing null to parameter #1 ($myParam) of type MyClass|int is deprecated in /path/to/my_module.php on line 6

EOS
*/;} //jshint ignore:line
        ));
        // NB: Stdout should have a leading newline written out just before the message.
        expect(engine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS

Deprecated: do_something(): Passing null to parameter #1 ($myParam) of type MyClass|int is deprecated in /path/to/my_module.php on line 6

EOS
*/;} //jshint ignore:line
        ));
    });

    it('should not raise a deprecation notice when null is passed to a nullable parameter of builtin function', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

$result['with null'] = do_something(null);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction(
            'do_something',
            function (myParamValue) {
                return 'type: ' + myParamValue.getType();
            },
            'string|null $myParam : string'
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with null': 'type: null'
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should not raise a deprecation notice when null is passed to a non-nullable non-scalar parameter of builtin function', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

$result['with null'] = do_something(null);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction(
            'do_something',
            function (myParamValue) {
                return 'type: ' + myParamValue.getType();
            },
            'MyClass $myParam : string'
        );

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: do_something(): Argument #1 ($myParam) must be of type MyClass, null given ' +
            'in /path/to/my_module.php:6 ' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr.
            'in /path/to/my_module.php on line 6'
        );
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught TypeError: do_something(): Argument #1 ($myParam) must be of type MyClass, null given in /path/to/my_module.php:6
Stack trace:
#0 {main}
  thrown in /path/to/my_module.php on line 6

EOS
*/;}) //jshint ignore:line
        );
        expect(engine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught TypeError: do_something(): Argument #1 ($myParam) must be of type MyClass, null given in /path/to/my_module.php:6
Stack trace:
#0 {main}
  thrown in /path/to/my_module.php on line 6

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should not raise a deprecation notice when null is passed to a non-nullable parameter of userland function', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

function do_something(string $myParam) {
    return strlen($myParam);
}

$result['with null'] = do_something(null);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: do_something(): Argument #1 ($myParam) must be of type string, null given, ' +
            'called in /path/to/my_module.php on line 10 and defined in /path/to/my_module.php:6 ' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr.
            'in /path/to/my_module.php on line 6'
        );
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught TypeError: do_something(): Argument #1 ($myParam) must be of type string, null given, called in /path/to/my_module.php on line 10 and defined in /path/to/my_module.php:6
Stack trace:
#0 /path/to/my_module.php(10): do_something(NULL)
#1 {main}
  thrown in /path/to/my_module.php on line 6

EOS
*/;}) //jshint ignore:line
        );
        expect(engine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught TypeError: do_something(): Argument #1 ($myParam) must be of type string, null given, called in /path/to/my_module.php on line 10 and defined in /path/to/my_module.php:6
Stack trace:
#0 /path/to/my_module.php(10): do_something(NULL)
#1 {main}
  thrown in /path/to/my_module.php on line 6

EOS
*/;}) //jshint ignore:line
        );
    });
});
