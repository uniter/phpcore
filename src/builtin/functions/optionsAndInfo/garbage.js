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
    var garbageCollector = internals.garbageCollector,
        optionSet = internals.optionSet;

    return {
        /**
         * Forces collection of any existing garbage cycles.
         *
         * @see {@link https://secure.php.net/manual/en/function.gc-collect-cycles.php}
         */
        'gc_collect_cycles': internals.typeFunction(': int', function () {
            if (optionSet.getOption('garbageCollection') !== true) {
                // Garbage collection is opt-in for now, especially while it is only partially implemented.
                return 0;
            }

            /*
             * NB: Technically this should only return the number of collected cycles,
             *     as reference counting should collect all non-cyclical values.
             *
             *     However, we have a mark & sweep garbage collector and no reference counting,
             *     so we return the total number of values collected instead.
             */

            return garbageCollector.collect();
        })
    };
};
