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

describe('Output buffering integration', function () {
    it('should support buffering output', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

push_buffer();
print 'Hello' . PHP_EOL;
$result[] = get_and_empty_buffer();
print 'There' . PHP_EOL;
$result[] = get_and_empty_buffer();
pop_buffer();
print 'World' . PHP_EOL;

return $result;
EOS
*/;}), //jshint ignore:line
            environment = tools.createAsyncEnvironment({}, [
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                'get_and_empty_buffer': function () {
                                    var bufferContents = internals.output.getCurrentBufferContents();

                                    internals.output.cleanCurrentBuffer();

                                    return internals.valueFactory.createString(bufferContents);
                                },
                                'push_buffer': function () {
                                    internals.output.pushBuffer();
                                },
                                'pop_buffer': function () {
                                    internals.output.popBuffer();
                                }
                            };
                        }
                    ]
                }
            ]),
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module({}, environment);

        expect((await engine.execute()).getNative()).to.deep.equal([
            'Hello\n',
            'There\n'
        ]);
        expect(engine.getStdout().readAll()).to.equal('World\n');
    });
});
