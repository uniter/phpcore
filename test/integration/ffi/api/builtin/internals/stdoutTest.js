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

describe('PHP builtin FFI internals integration', function () {
    it('should support capturing stdout', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
print 'first' . PHP_EOL;

install_stdout_hook(); // The print above should not be captured

print 'second' . PHP_EOL;

print 'third' . PHP_EOL;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            log = [],
            environment = tools.createSyncEnvironment({}, [
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                'install_stdout_hook': function () {
                                    internals.stdout.on('data', function (data) {
                                        log.push('stdout :: ' + data);
                                    });
                                }
                            };
                        }
                    ]
                }
            ]);

        module({}, environment).execute();

        expect(log).to.deep.equal([
            // Note that "first" is not captured, as the stdout hook
            // was not installed until after that print had run
            'stdout :: second\n',
            'stdout :: third\n'
        ]);
    });
});
