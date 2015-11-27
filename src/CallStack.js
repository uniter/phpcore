/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    phpCommon = require('phpcommon'),
    PHPError = phpCommon.PHPError;

function CallStack(stderr) {
    this.calls = [];
    this.stderr = stderr;
}

_.extend(CallStack.prototype, {
    getCurrent: function () {
        var chain = this;

        return chain.calls[chain.calls.length - 1];
    },

    pop: function () {
        this.calls.pop();
    },

    push: function (call) {
        this.calls.push(call);
    },

    raiseError: function (level, message) {
        var call,
            chain = this,
            calls = chain.calls,
            error,
            index;

        // Some constructs like isset(...) should only suppress errors
        // for their own scope
        if (chain.getCurrent().getScope().suppressesOwnErrors()) {
            return;
        }

        for (index = calls.length - 1; index >= 0; --index) {
            call = calls[index];

            if (call.getScope().suppressesErrors()) {
                return;
            }
        }

        error = new PHPError(level, message);

        chain.stderr.write(error.message + '\n');
    }
});

module.exports = CallStack;
