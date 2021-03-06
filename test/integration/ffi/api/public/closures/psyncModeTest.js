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
    tools = require('../../../../tools');

describe('PHP public FFI closure Promise-synchronous mode integration', function () {
    it('should support calling an exported closure with a number', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return function ($myNumber) {
    return $myNumber + 4;
};
EOS
*/;}), //jshint ignore:line
            module = tools.psyncTranspile('/path/to/my_module.php', php),
            engine = module();

        return engine.execute().then(function (resultValue) {
            return expect(resultValue.getNative()(21)).to.eventually.equal(25);
        });
    });

    it('should support calling an exported closure with a function that returns an FFIResult that resolves to a number', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return function (callable $callback) {
    return $callback(21) + 100;
};
EOS
*/;}), //jshint ignore:line
            module = tools.psyncTranspile('/path/to/my_module.php', php),
            engine = module();

        return engine.execute().then(function (resultValue) {
            return expect(
                resultValue.getNative()(
                    function (number) {
                        return engine.createFFIResult(function () {
                            return number + 1;
                        }, function () {
                            throw new Error('This test should run in psync mode and use the sync callback');
                        });
                    }
                )
            ).to.eventually.equal(122);
        });
    });

    it('should support calling an exported closure with a custom function that receives an ObjectValue', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public function getIt() {
        return 21;
    }
}

return function (callable $callback) {
    $myObject = new MyClass();

    return $callback($myObject) + 4;
};
EOS
*/;}), //jshint ignore:line
            module = tools.psyncTranspile('/path/to/my_module.php', php),
            engine = module();

        return engine.execute().then(function (resultValue) {
            return expect(
                resultValue.getNative()(
                    function (object) {
                        return engine.createFFIResult(function () {
                            var syncObject = engine.toNativeWithSyncApi(object);

                            return syncObject.getIt() + 2;
                        }, function () {
                            throw new Error('This test should run in psync mode and use the sync callback');
                        });
                    }
                )
            ).to.eventually.equal(27);
        });
    });
});
