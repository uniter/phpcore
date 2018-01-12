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

describe('PHP JS<->PHP bridge PHP object import synchronous mode integration', function () {
    describe('when importing an exported PHP object from JS-land back into PHP-land', function () {
        beforeEach(function () {
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

    public function isEntity($object) {
        return $object instanceof MyEntity;
    }
}

return new MyChildAPI();
EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php),
                phpEngine = module();

            this.moduleResult = phpEngine.execute();
        });

        it('should be able to import when exported with .getNative()', function () {
            var unwrappedAPI = this.moduleResult.getNative(),
                unwrappedEntity;

            expect(unwrappedAPI).not.to.be.an.instanceOf(PHPObject);

            // Call methods on the unwrapped object with the same names as the PHP class' methods
            unwrappedEntity = unwrappedAPI.create(21);

            expect(unwrappedAPI.fetch(unwrappedEntity)).to.equal(21);
            expect(unwrappedAPI.isEntity(unwrappedEntity)).to.be.true;
        });

        it('should be able to import when exported with .getProxy()', function () {
            var unwrappedAPI = this.moduleResult.getProxy(),
                unwrappedEntity;

            expect(unwrappedAPI).to.be.an.instanceOf(PHPObject);

            // Use the proxying .callMethod(...) method to call the PHP class' methods
            unwrappedEntity = unwrappedAPI.callMethod('create', 101);

            expect(unwrappedAPI.callMethod('fetch', unwrappedEntity)).to.equal(101);
            expect(unwrappedAPI.callMethod('isEntity', unwrappedEntity)).to.be.true;
        });
    });
});
