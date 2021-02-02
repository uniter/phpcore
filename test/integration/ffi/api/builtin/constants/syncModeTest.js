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

describe('PHP builtin FFI constant synchronous mode integration', function () {
    it('should support installing a custom constant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return MY_CONSTANT;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            environment = tools.createSyncEnvironment({}, [
                {
                    constantGroups: [
                        function () {
                            return {
                                'MY_CONSTANT': 1024
                            };
                        }
                    ]
                }
            ]),
            engine = module({}, environment);

        expect(engine.execute().getNative()).to.equal(1024);
        expect(engine.getStdout().readAll()).to.equal('');
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
