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

module.exports = function (internals) {
    /**
     * Class used to represent Generators.
     *
     * @see {@link https://secure.php.net/manual/en/class.generator.php}
     *
     * @constructor
     */
    function Generator() {

    }

    internals.implement('Iterator');

    _.extend(Generator.prototype, {
        /**
         * Fetches the last yielded value, or advances the generator until its first yield or return.
         *
         * @see {@link https://secure.php.net/manual/en/generator.current.php}
         */
        'current': internals.typeInstanceMethod(': mixed', function () {
            var iterator = this.getInternalProperty('iterator');

            return iterator.getCurrentElementValue();
        }),

        /**
         * Fetches the return value of the generator if it has finished.
         *
         * @see {@link https://secure.php.net/manual/en/generator.getreturn.php}
         */
        'getReturn': internals.typeInstanceMethod(': mixed', function () {
            var iterator = this.getInternalProperty('iterator');

            return iterator.getReturnValue();
        }),

        /**
         * Fetches the last yielded key, or advances the generator until its first yield or return.
         *
         * @see {@link https://secure.php.net/manual/en/generator.key.php}
         */
        'key': internals.typeInstanceMethod(': mixed', function () {
            var iterator = this.getInternalProperty('iterator');

            return iterator.getCurrentKey();
        }),

        /**
         * Resumes execution of the generator. Identical to "->send(null)".
         *
         * @see {@link https://secure.php.net/manual/en/generator.next.php}
         */
        'next': internals.typeInstanceMethod(': void', function () {
            var iterator = this.getInternalProperty('iterator');

            return iterator.advance();
        }),

        /**
         * Executes the generator up to its first yield statement.
         *
         * @see {@link https://secure.php.net/manual/en/generator.rewind.php}
         */
        'rewind': internals.typeInstanceMethod(': void', function () {
            var iterator = this.getInternalProperty('iterator');

            return iterator.rewind();
        }),

        /**
         * Resumes execution of the generator. Returns the next yielded value.
         *
         * @see {@link https://secure.php.net/manual/en/generator.send.php}
         */
        'send': internals.typeInstanceMethod('mixed $value : mixed', function (value) {
            var iterator = this.getInternalProperty('iterator');

            return iterator.send(value);
        }),

        /**
         * Throws a Throwable into the generator. Returns the next yielded value.
         *
         * If the generator is closed, the Throwable will be thrown in the caller's context instead.
         *
         * @see {@link https://secure.php.net/manual/en/generator.throw.php}
         */
        'throw': internals.typeInstanceMethod('Throwable $exception : mixed', function (throwableValue) {
            var iterator = this.getInternalProperty('iterator');

            return iterator.throwInto(throwableValue);
        }),

        /**
         * Determines whether the generator has been closed.
         *
         * @see {@link https://secure.php.net/manual/en/generator.valid.php}
         */
        'valid': internals.typeInstanceMethod(': bool', function () {
            var iterator = this.getInternalProperty('iterator');

            return iterator.isNotFinished();
        })
    });

    internals.disableAutoCoercion();

    // Support unwrapping PHP generators to native JS generators.
    // TODO: Add support for native .throw() and .return().
    internals.defineUnwrapper(function (generatorObjectValue) {
        var iterator = generatorObjectValue.getInternalProperty('iterator');

        async function* nativeGenerator() {
            var nextValue,
                receivedValue;

            while (iterator.isNotFinished()) {
                nextValue = await iterator.getCurrentElementValue().toPromise();

                if (iterator.hasReturned()) {
                    return iterator.getReturnValue().getNative();
                }

                // TODO: Wrap in try...catch so we can throw generator.throw(...)s into PHP-land?
                receivedValue = yield nextValue.getNative();

                if (receivedValue === undefined) {
                    // No value was passed to .next() (e.g. it was a for...of loop).
                    await iterator.advance().toPromise();
                } else {
                    /*
                     * A value was passed to .next(), to be sent back into the generator.
                     *
                     * Note that any subsequent yield will be picked up just below or on the next iteration
                     * of this native loop.
                     */
                    await iterator.send(iterator.valueFactory.coerce(receivedValue)).toPromise();
                }

                if (iterator.hasReturned()) {
                    return iterator.getReturnValue().getNative();
                }
            }
        }

        return nativeGenerator();
    });

    return Generator;
};
