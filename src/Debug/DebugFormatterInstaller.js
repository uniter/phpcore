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
 * Installer for the debugging variable formatter
 * for Chrome's Developer Tools
 *
 * @param {Window} window
 * @param {class} DebugFormatter
 * @param {class} ValueFormatter
 * @constructor
 */
function DebugFormatterInstaller(window, DebugFormatter, ValueFormatter) {
    /**
     * @type {class}
     */
    this.DebugFormatter = DebugFormatter;
    /**
     * @type {class}
     */
    this.ValueFormatter = ValueFormatter;
    /**
     * @type {Window}
     */
    this.window = window;
}

_.extend(DebugFormatterInstaller.prototype, {
    /**
     * Installs a DebugFormatter into the global scope
     * for Chrome's Developer Tools to pick up
     */
    install: function () {
        var installer = this,
            valueFormatter = new installer.ValueFormatter(),
            debugFormatter = new installer.DebugFormatter(valueFormatter);

        if (!installer.window.devtoolsFormatters) {
            installer.window.devtoolsFormatters = [];
        }

        installer.window.devtoolsFormatters.push(debugFormatter);
    }
});

module.exports = DebugFormatterInstaller;
