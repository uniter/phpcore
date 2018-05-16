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
    /**
     * Interface for classes traversable using foreach (extended by Iterator and IteratorAggregate)
     *
     * @see {@link https://secure.php.net/manual/en/class.traversable.php}
     *
     * @interface
     */
    function Traversable() {

    }

    Traversable.shadowConstructor = function () {
        var traversableValue = this;

        traversableValue.setInternalProperty('getIterator', function () {
            throw new Error('\\Traversable: Sub-interface should have set the iterator getter');
        });
    };

    internals.disableAutoCoercion();

    return Traversable;
};
