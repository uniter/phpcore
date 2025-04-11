/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = function (internals) {
    var state = internals.state,
        valueFactory = internals.valueFactory;

    // Note that $GLOBALS is defined in the PHPState class.

    state.defineSuperGlobal('_COOKIE', valueFactory.createArray([]));
    state.defineSuperGlobal('_ENV', valueFactory.createArray([]));
    state.defineSuperGlobal('_FILES', valueFactory.createArray([]));
    state.defineSuperGlobal('_GET', valueFactory.createArray([]));
    state.defineSuperGlobal('_POST', valueFactory.createArray([]));
    state.defineSuperGlobal('_REQUEST', valueFactory.createArray([]));
    state.defineSuperGlobal('_SERVER', valueFactory.createArray([]));
    state.defineSuperGlobal('_SESSION', valueFactory.createArray([]));
};
