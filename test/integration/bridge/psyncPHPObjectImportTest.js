/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var expect = require('chai').expect,
    nowdoc = require('nowdoc'),
    tools = require('../tools'),
    PHPObject = require('../../../src/PHPObject').sync();

describe('PHP JS<->PHP bridge PHP object import Promise-synchronous mode integration', function () {
    describe('when importing an exported PHP object from JS-land back into PHP-land', function () {
        beforeEach(function (done) {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyEntity {
    private $myProp;

    public function __construct($myArg) {
        $this->myProp = $myArg;
    }

    public function getMyProp() {
        return $this->myProp;
    }
}

class MyParentAPI {
    public function create($myArg) {
        return new MyEntity($myArg);
    }
}

// Spread the API methods across a hierarchy of classes,
// to test that ancestor class' methods are included in the unwrapped class too
class MyChildAPI extends MyParentAPI {
    public function fetch(MyEntity $entity) {
        return $entity->getMyProp();
    }
}

return new MyChildAPI();
EOS
*/;}),//jshint ignore:line
                module = tools.psyncTranspile(null, php),
                phpEngine = module();

            phpEngine.execute().then(function (moduleResult) {
                this.moduleResult = moduleResult;
                done();
            }.bind(this));
        });

        it('should be able to import when exported with .getNative()', function () {
            var unwrappedAPI = this.moduleResult.getNative();

            expect(unwrappedAPI).not.to.be.an.instanceOf(PHPObject);

            // Call methods on the unwrapped object with the same names as the PHP class' methods
            return unwrappedAPI.create(21).then(function (unwrappedEntity) {
                return unwrappedAPI.fetch(unwrappedEntity).then(function (resultValue) {
                    expect(resultValue).to.equal(21);
                });
            });
        });

        it('should be able to import when exported with .getProxy()', function () {
            var unwrappedAPI = this.moduleResult.getProxy();

            expect(unwrappedAPI).to.be.an.instanceOf(PHPObject);

            // Use the proxying .callMethod(...) method to call the PHP class' methods
            return unwrappedAPI.callMethod('create', 101).then(function (unwrappedEntity) {
                return unwrappedAPI.callMethod('fetch', unwrappedEntity).then(function (resultValue) {
                    expect(resultValue).to.equal(101);
                });
            });
        });
    });
});
