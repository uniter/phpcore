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
     * Interface for user-defined iterators or objects that can be iterated themselves internally
     *
     * @see {@link https://secure.php.net/manual/en/class.iteratoraggregate.php}
     *
     * @interface
     */
    function IteratorAggregate() {

    }

    internals.implement('Traversable');

    IteratorAggregate.shadowConstructor = function () {
        var aggregateValue = this;

        aggregateValue.setInternalProperty('getIterator', function () {
            // Implementors of IteratorAggregate expose their iterator via a ->getIterator() method
            return aggregateValue.callMethod('getIterator');
        });
    };

    IteratorAggregate.prototype.getIterator = function () {
        throw new Error('Interface method should be implemented by sub-classes');
    };

    return IteratorAggregate;
};
