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
 * @interface
 * @extends {ChainableInterface}
 */
function FutureInterface() {
    throw new Error('FutureInterface cannot be instantiated');
}

_.extend(FutureInterface.prototype, {

});

module.exports = FutureInterface;
