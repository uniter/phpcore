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
    Pause = require('./Pause'),
    Promise = require('lie');

/**
 * @param {CallStack} callStack
 * @param {ControlScope} controlScope
 * @param {string} mode
 * @constructor
 */
function Userland(callStack, controlScope, mode) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ControlScope}
     */
    this.controlScope = controlScope;
    /**
     * @type {string}
     */
    this.mode = mode;
}

_.extend(Userland.prototype, {
    call: function (handler, args) {
        var userland = this;

        if (userland.mode === 'async') {
            return new Promise(function (resolve, reject) {
                function run() {
                    try {
                        resolve(handler.apply(null, args));
                    } catch (error) {
                        if (error instanceof Pause) {
                            error.next(
                                function (/* result */) {
                                    /*
                                     * Note that the result passed here for the opcode we are about to resume
                                     * by re-calling the userland function has already been provided (see Pause),
                                     * so the result argument passed to this callback may be ignored.
                                     */

                                    return run();
                                },
                                function (/* error */) {
                                    /*
                                     * Note that the error passed here for the opcode we are about to throwInto
                                     * by re-calling the userland function has already been provided (see Pause),
                                     * so the result argument passed to this callback may be ignored.
                                     */

                                    return run();
                                }
                            );

                            userland.controlScope.markPaused(error); // Call stack should be unwound by this point

                            return;
                        }

                        reject(error);
                    }
                }

                run();
            });
        }

        return handler.apply(null, args);
    }
});

module.exports = Userland;
