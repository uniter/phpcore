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
     * @see {@link https://secure.php.net/manual/en/class.iterator.php}
     *
     * @interface
     */
    function Iterator() {

    }

    internals.implement('Traversable');

    Iterator.shadowConstructor = function () {
        var iteratorValue = this;

        iteratorValue.setInternalProperty('getIterator', function () {
            // Implementors of Iterator are themselves iterable
            return iteratorValue;
        });
    };

    return Iterator;
};
