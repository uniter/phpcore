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
    sinon = require('sinon'),
    GarbageFactory = require('../../../src/Garbage/GarbageFactory'),
    Map = require('core-js-pure/actual/map'),
    MarkRoot = require('../../../src/Garbage/MarkRoot'),
    ReferenceCache = require('../../../src/Garbage/ReferenceCache'),
    ReferenceTreeWalker = require('../../../src/Garbage/ReferenceTreeWalker'),
    Value = require('../../../src/Value').sync();

describe('Garbage ReferenceTreeWalker', function () {
    var garbageFactory,
        gcRootToMarkRootMap,
        reachableValueToMarkRootMap,
        referenceCache,
        walker;

    beforeEach(function () {
        garbageFactory = new GarbageFactory();
        // Use strong Maps rather than the WeakMaps used in the implementation
        // so that we can inspect them during testing.
        gcRootToMarkRootMap = new Map();
        reachableValueToMarkRootMap = new Map();
        referenceCache = sinon.createStubInstance(ReferenceCache);

        referenceCache.getGcRootToMarkRootMap.returns(gcRootToMarkRootMap);
        referenceCache.getReachableValueToMarkRootMap.returns(reachableValueToMarkRootMap);

        walker = new ReferenceTreeWalker(garbageFactory, referenceCache);
    });

    describe('mark()', function () {
        describe('when there are no GC roots', function () {
            it('should add no entries to the maps', function () {
                walker.mark([]);

                expect(gcRootToMarkRootMap.size).to.equal(0);
                expect(reachableValueToMarkRootMap.size).to.equal(0);
            });
        });

        describe('when there is a single GC root with no outgoing structured values', function () {
            it('should add the correct entries to the maps', function () {
                var gcRoot = sinon.createStubInstance(Value),
                    markRoot;
                gcRoot.getOutgoingValues.returns([]);

                walker.mark([gcRoot]);

                expect(gcRootToMarkRootMap.size).to.equal(1);
                markRoot = gcRootToMarkRootMap.get(gcRoot);
                expect(markRoot).to.be.an.instanceOf(MarkRoot);
                expect(markRoot.getGcRoot()).to.equal(gcRoot);
                expect(markRoot.isValid()).to.be.true;
                expect(reachableValueToMarkRootMap.size).to.equal(1);
                expect(reachableValueToMarkRootMap.get(gcRoot)).to.equal(markRoot);
            });
        });

        describe('when there is a single GC root with two outgoing structured values and one other', function () {
            var gcRoot,
                outgoingValue1,
                outgoingValue2;

            beforeEach(function () {
                gcRoot = sinon.createStubInstance(Value);
                outgoingValue1 = sinon.createStubInstance(Value);
                outgoingValue2 = sinon.createStubInstance(Value);
                outgoingValue1.getOutgoingValues.returns([]);
                outgoingValue2.getOutgoingValues.returns([]);

                gcRoot.getOutgoingValues.returns([
                    outgoingValue1,
                    outgoingValue2
                ]);
            });

            it('should add the correct entries to the maps when cache is empty', function () {
                var markRoot;

                walker.mark([gcRoot]);

                expect(gcRootToMarkRootMap.size).to.equal(1);
                markRoot = gcRootToMarkRootMap.get(gcRoot);
                expect(markRoot).to.be.an.instanceOf(MarkRoot);
                expect(markRoot.getGcRoot()).to.equal(gcRoot);
                expect(markRoot.isValid()).to.be.true;
                expect(reachableValueToMarkRootMap.size).to.equal(3);
                expect(reachableValueToMarkRootMap.get(gcRoot)).to.equal(markRoot);
                expect(reachableValueToMarkRootMap.get(outgoingValue1)).to.equal(markRoot);
                expect(reachableValueToMarkRootMap.get(outgoingValue2)).to.equal(markRoot);
            });

            it('should add the correct entries to the maps when cache already contains an invalidated MarkRoot', function () {
                var invalidatedMarkRoot = sinon.createStubInstance(MarkRoot),
                    markRoot;
                invalidatedMarkRoot.isValid.returns(false);
                reachableValueToMarkRootMap.set(outgoingValue1, invalidatedMarkRoot);

                walker.mark([gcRoot]);

                expect(gcRootToMarkRootMap.size).to.equal(1);
                markRoot = gcRootToMarkRootMap.get(gcRoot);
                expect(markRoot).to.be.an.instanceOf(MarkRoot);
                expect(markRoot).not.to.equal(invalidatedMarkRoot);
                expect(markRoot.getGcRoot()).to.equal(gcRoot);
                expect(markRoot.isValid()).to.be.true;
                expect(reachableValueToMarkRootMap.size).to.equal(3);
                expect(reachableValueToMarkRootMap.get(gcRoot)).to.equal(markRoot);
                expect(reachableValueToMarkRootMap.get(outgoingValue1)).to.equal(markRoot);
                expect(reachableValueToMarkRootMap.get(outgoingValue2)).to.equal(markRoot);
            });
        });

        describe('when there are four GC roots and the third one\'s tree eventually references the first two', function () {
            var gcRoot1,
                gcRoot2,
                gcRoot3,
                gcRoot4,
                gcRoot1Value1,
                gcRoot1Value2,
                gcRoot1Value3,
                gcRoot2Value1,
                gcRoot2Value2,
                gcRoot3Value1,
                gcRoot3Value2,
                gcRoot4Value1,
                gcRoot4Value2,
                markRoot1,
                markRoot2,
                markRoot3,
                markRoot4,
                markTree1;

            beforeEach(function () {
                gcRoot1 = sinon.createStubInstance(Value);
                gcRoot2 = sinon.createStubInstance(Value);
                gcRoot3 = sinon.createStubInstance(Value);
                gcRoot4 = sinon.createStubInstance(Value);
                gcRoot1Value1 = sinon.createStubInstance(Value);
                gcRoot1Value2 = sinon.createStubInstance(Value);
                gcRoot1Value3 = sinon.createStubInstance(Value);
                gcRoot2Value1 = sinon.createStubInstance(Value);
                gcRoot2Value2 = sinon.createStubInstance(Value);
                gcRoot3Value1 = sinon.createStubInstance(Value);
                gcRoot3Value2 = sinon.createStubInstance(Value);
                gcRoot4Value1 = sinon.createStubInstance(Value);
                gcRoot4Value2 = sinon.createStubInstance(Value);

                gcRoot1.getOutgoingValues.returns([gcRoot1Value1, gcRoot1Value2]);
                gcRoot1Value1.getOutgoingValues.returns([]);
                gcRoot1Value2.getOutgoingValues.returns([gcRoot1Value3]);
                gcRoot1Value3.getOutgoingValues.returns([]);

                gcRoot2.getOutgoingValues.returns([gcRoot2Value1]);
                gcRoot2Value1.getOutgoingValues.returns([gcRoot2Value2]);
                gcRoot2Value2.getOutgoingValues.returns([]);

                gcRoot3.getOutgoingValues.returns([gcRoot3Value1]);
                gcRoot3Value1.getOutgoingValues.returns([gcRoot3Value2]);
                // Third GC root's tree ends up referring to both of the first two root's trees.
                gcRoot3Value2.getOutgoingValues.returns([gcRoot1Value3, gcRoot2Value1]);

                // Fourth root is left unlinked to the other three.
                gcRoot4.getOutgoingValues.returns([gcRoot4Value1]);
                gcRoot4Value1.getOutgoingValues.returns([gcRoot4Value2]);
                gcRoot4Value2.getOutgoingValues.returns([]);
            });

            it('should add the correct entries to the maps when cache is empty', function () {
                walker.mark([gcRoot1, gcRoot2, gcRoot3, gcRoot4]);

                expect(gcRootToMarkRootMap.size).to.equal(4);
                markRoot1 = gcRootToMarkRootMap.get(gcRoot1);
                expect(markRoot1).to.be.an.instanceOf(MarkRoot);
                markTree1 = markRoot1.getTree();
                expect(markRoot1.getGcRoot()).to.equal(gcRoot1);
                expect(markRoot1.isValid()).to.be.true;
                markRoot2 = gcRootToMarkRootMap.get(gcRoot2);
                expect(markRoot2).to.be.an.instanceOf(MarkRoot);
                expect(markRoot2.getTree()).to.equal(markTree1);
                expect(markRoot2.getGcRoot()).to.equal(gcRoot2);
                expect(markRoot2.isValid()).to.be.true;
                markRoot3 = gcRootToMarkRootMap.get(gcRoot3);
                expect(markRoot3).to.be.an.instanceOf(MarkRoot);
                expect(markRoot3.getTree()).to.equal(markTree1);
                expect(markRoot3.getGcRoot()).to.equal(gcRoot3);
                expect(markRoot3.isValid()).to.be.true;
                markRoot4 = gcRootToMarkRootMap.get(gcRoot4);
                expect(markRoot4).to.be.an.instanceOf(MarkRoot);
                expect(markRoot4.getTree()).not.to.equal(markTree1);
                expect(markRoot4.getGcRoot()).to.equal(gcRoot4);
                expect(markRoot4.isValid()).to.be.true;
                expect(reachableValueToMarkRootMap.size).to.equal(13);

                expect(reachableValueToMarkRootMap.get(gcRoot1)).to.equal(markRoot1);
                expect(reachableValueToMarkRootMap.get(gcRoot1Value1)).to.equal(markRoot1);
                expect(reachableValueToMarkRootMap.get(gcRoot1Value2)).to.equal(markRoot1);
                expect(reachableValueToMarkRootMap.get(gcRoot1Value3)).to.equal(markRoot1);

                expect(reachableValueToMarkRootMap.get(gcRoot2)).to.equal(markRoot2);
                expect(reachableValueToMarkRootMap.get(gcRoot2Value1)).to.equal(markRoot2);
                expect(reachableValueToMarkRootMap.get(gcRoot2Value2)).to.equal(markRoot2);

                expect(reachableValueToMarkRootMap.get(gcRoot3)).to.equal(markRoot3);
                expect(reachableValueToMarkRootMap.get(gcRoot3Value1)).to.equal(markRoot3);
                expect(reachableValueToMarkRootMap.get(gcRoot3Value2)).to.equal(markRoot3);

                expect(reachableValueToMarkRootMap.get(gcRoot4)).to.equal(markRoot4);
                expect(reachableValueToMarkRootMap.get(gcRoot4Value1)).to.equal(markRoot4);
                expect(reachableValueToMarkRootMap.get(gcRoot4Value2)).to.equal(markRoot4);
            });

            it('should add the correct entries to the maps, leaving valid existing entries alone', function () {
                var existingValidMarkRoot = sinon.createStubInstance(MarkRoot);
                existingValidMarkRoot.isValid.returns(true);
                gcRootToMarkRootMap.set(gcRoot4, existingValidMarkRoot);
                reachableValueToMarkRootMap.set(gcRoot4, existingValidMarkRoot);
                reachableValueToMarkRootMap.set(gcRoot4Value1, existingValidMarkRoot);
                reachableValueToMarkRootMap.set(gcRoot4Value2, existingValidMarkRoot);

                walker.mark([gcRoot1, gcRoot2, gcRoot3, gcRoot4]);

                expect(gcRootToMarkRootMap.size).to.equal(4);
                markRoot1 = gcRootToMarkRootMap.get(gcRoot1);
                expect(markRoot1).to.be.an.instanceOf(MarkRoot);
                markTree1 = markRoot1.getTree();
                expect(markRoot1.getGcRoot()).to.equal(gcRoot1);
                expect(markRoot1.isValid()).to.be.true;
                markRoot2 = gcRootToMarkRootMap.get(gcRoot2);
                expect(markRoot2).to.be.an.instanceOf(MarkRoot);
                expect(markRoot2.getTree()).to.equal(markTree1);
                expect(markRoot2.getGcRoot()).to.equal(gcRoot2);
                expect(markRoot2.isValid()).to.be.true;
                markRoot3 = gcRootToMarkRootMap.get(gcRoot3);
                expect(markRoot3).to.be.an.instanceOf(MarkRoot);
                expect(markRoot3.getTree()).to.equal(markTree1);
                expect(markRoot3.getGcRoot()).to.equal(gcRoot3);
                expect(markRoot3.isValid()).to.be.true;
                markRoot4 = gcRootToMarkRootMap.get(gcRoot4);
                expect(markRoot4).to.equal(existingValidMarkRoot);
                expect(reachableValueToMarkRootMap.size).to.equal(13);

                expect(reachableValueToMarkRootMap.get(gcRoot1)).to.equal(markRoot1);
                expect(reachableValueToMarkRootMap.get(gcRoot1Value1)).to.equal(markRoot1);
                expect(reachableValueToMarkRootMap.get(gcRoot1Value2)).to.equal(markRoot1);
                expect(reachableValueToMarkRootMap.get(gcRoot1Value3)).to.equal(markRoot1);

                expect(reachableValueToMarkRootMap.get(gcRoot2)).to.equal(markRoot2);
                expect(reachableValueToMarkRootMap.get(gcRoot2Value1)).to.equal(markRoot2);
                expect(reachableValueToMarkRootMap.get(gcRoot2Value2)).to.equal(markRoot2);

                expect(reachableValueToMarkRootMap.get(gcRoot3)).to.equal(markRoot3);
                expect(reachableValueToMarkRootMap.get(gcRoot3Value1)).to.equal(markRoot3);
                expect(reachableValueToMarkRootMap.get(gcRoot3Value2)).to.equal(markRoot3);

                // Existing MarkRoot should be left alone.
                expect(reachableValueToMarkRootMap.get(gcRoot4)).to.equal(existingValidMarkRoot);
                expect(reachableValueToMarkRootMap.get(gcRoot4Value1)).to.equal(existingValidMarkRoot);
                expect(reachableValueToMarkRootMap.get(gcRoot4Value2)).to.equal(existingValidMarkRoot);
            });
        });
    });
});
