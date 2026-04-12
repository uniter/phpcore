'use strict';

/**
 * @deprecated Remove this.
 */
module.exports = function (done, callback) {
    return function (...args) {
        try {
            callback.apply(this, args);
            done();
        } catch (error) {
            done(error);
        }
    };
};
