/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * @constructor
 */
function OpcodeExecutor() {

}

_.extend(OpcodeExecutor.prototype, {
    /**
     * Executes the given opcode.
     *
     * Currently this class only exists to provide a hook point at which to override opcode execution,
     * eg. for forcing async opcode handling during integration testing.
     *
     * @param {OpcodeInterface} opcode
     * @returns {*}
     * @throws {Error|Pause}
     */
    execute: function (opcode) {
        return opcode.handle();
    }
});

module.exports = OpcodeExecutor;
