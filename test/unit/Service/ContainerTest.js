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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    Container = require('../../../src/Service/Container'),
    Exception = phpCommon.Exception;

describe('Service Container', function () {
    var container;

    beforeEach(function () {
        container = new Container();
    });

    describe('defineService()', function () {
        it('should throw when the service is already defined and allowOverride=false', function () {
            container.defineService('my.service', sinon.stub());

            expect(function () {
                // Attempt to define for a second time.
                container.defineService('my.service', sinon.stub());
            }).to.throw(
                Exception,
                'Service with ID "my.service" is already defined'
            );
        });

        it('should not throw when the service is already defined and allowOverride=true', function () {
            container.defineService('my.service', sinon.stub());

            expect(function () {
                // Attempt to define for a second time.
                container.defineService('my.service', sinon.stub(), true);
            }).not.to.throw();
        });

        it('should throw when allowOverride=true but the service has already been instantiated', function () {
            container.defineService('my.service', sinon.stub());

            // Instantiate the service.
            container.getService('my.service');

            expect(function () {
                // Attempt to define for a second time.
                container.defineService('my.service', sinon.stub(), true);
            }).to.throw(
                Exception,
                'Service with ID "my.service" has already been instantiated'
            );
        });

        it('should throw when allowOverride=true but the service has been set', function () {
            container.setService('my.service', {my: 'service'});

            expect(function () {
                // Attempt to define.
                container.defineService('my.service', sinon.stub(), true);
            }).to.throw(
                Exception,
                'Service with ID "my.service" has already been instantiated'
            );
        });
    });

    describe('getService()', function () {
        it('should instantiate a service using its provider when only defined', function () {
            var service = {my: 'service'},
                provider = sinon.stub().returns(service);

            container.defineService('my.service', provider);

            expect(container.getService('my.service')).to.equal(service);
        });

        it('should pass the service fetcher to the provider', function () {
            var service = {my: 'service'},
                provider = sinon.stub().returns(service);
            container.defineService('my.service', provider);

            container.getService('my.service');

            expect(provider).to.have.been.calledOnce;
            expect(provider).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(container.getServiceFetcher())
            );
        });

        describe('on subsequent calls', function () {
            it('should cache and return the same service object', function () {
                container.defineService('my.service', sinon.stub());

                expect(container.getService('my.service')).to.equal(container.getService('my.service'));
            });

            it('should not call the provider again', function () {
                var provider = sinon.stub();
                container.defineService('my.service', provider);

                // Even with three fetches, the provider should only have been called the first time
                // and the result cached.
                container.getService('my.service');
                container.getService('my.service');
                container.getService('my.service');

                expect(provider).to.have.been.calledOnce;
            });
        });

        describe('set() callback', function () {
            it('should allow the service to be set by the set() callback', function () {
                var service = {my: 'service'};

                container.defineService('my.service', function (set) {
                    set(service);
                });

                expect(container.getService('my.service')).to.equal(service);
            });

            it('should allow circular dependencies to be set up via deferred injection', function () {
                var fetchedService;
                container.defineService('my.service', function (set, get) {
                    var service = set({my: 'service'});

                    service.dependency = get('my.dependency');
                });
                container.defineService('my.dependency', function (set, get) {
                    var dependency = {my: 'dependency'};

                    dependency.parent = get('my.service');

                    return dependency;
                });

                fetchedService = container.getService('my.service');

                expect(fetchedService.my).to.equal('service');
                expect(fetchedService.dependency.my).to.equal('dependency');
                expect(fetchedService.dependency.parent).to.equal(fetchedService);
            });

            it('should throw when the provider subsequently returns a value after calling set()', function () {
                container.defineService('my.service', function (set) {
                    set({my: 'service'});

                    return {not: 'my service'};
                });

                expect(function () {
                    container.getService('my.service');
                }).to.throw(
                    Exception,
                    'Service "my.service" provider returned a value after calling set()'
                );
            });

            it('should throw when the provider calls set() twice', function () {
                container.defineService('my.service', function (set) {
                    set({my: 'service'});
                    set({another: 'service'});
                });

                expect(function () {
                    container.getService('my.service');
                }).to.throw(
                    Exception,
                    'Service "my.service" provider called set() multiple times'
                );
            });

            it('should throw when the provider calls set() after using the return approach', function () {
                var doSet;

                container.defineService('my.service', function (set) {
                    doSet = set;

                    return {my: 'service'};
                });
                container.getService('my.service');

                expect(function () {
                    doSet({another: 'service'});
                }).to.throw(
                    Exception,
                    'Service "my.service" provider already returned a value, but set() was later called'
                );
            });
        });

        it('should throw when the requested service was not defined', function () {
            expect(function () {
                container.getService('my.undefined.service');
            }).to.throw(
                Exception,
                'No service with ID "my.undefined.service" is defined'
            );
        });

        it('should throw when an immediate dependency of the requested service was not defined', function () {
            container.defineService('my.service', function () {
                container.getService('my.undefined.dependency');
            });

            expect(function () {
                container.getService('my.service');
            }).to.throw(
                Exception,
                'No service with ID "my.undefined.dependency" is defined, chain was: "my.service"'
            );
        });

        it('should throw when a second-level dependency of the requested service was not defined', function () {
            container.defineService('my.service', function () {
                container.getService('my.dependency');
            });
            container.defineService('my.dependency', function () {
                container.getService('my.undefined.dependency');
            });

            expect(function () {
                container.getService('my.service');
            }).to.throw(
                Exception,
                'No service with ID "my.undefined.dependency" is defined, chain was: "my.service" -> "my.dependency" -> "my.undefined.dependency"'
            );
        });

        it('should throw for a circular dependency chain', function () {
            container.defineService('my.service', function () {
                container.getService('my.first.dependency');
            });
            container.defineService('my.first.dependency', function () {
                container.getService('my.second.dependency');
            });
            container.defineService('my.second.dependency', function () {
                // Refers back to the original service, creating a circular reference.
                container.getService('my.service');
            });

            expect(function () {
                container.getService('my.service');
            }).to.throw(
                Exception,
                'Circular service dependency detected while fetching id "my.service", chain was: "my.service" -> "my.first.dependency" -> "my.second.dependency" -> "my.service"'
            );
        });
    });

    describe('getServiceFetcher()', function () {
        it('should return a service fetcher function bound to the container', function () {
            var fetcher,
                service = {my: 'service'},
                provider = sinon.stub().returns(service);
            container.defineService('my.service', provider);

            fetcher = container.getServiceFetcher();

            expect(fetcher('my.service')).to.equal(service);
        });

        it('should always return the same fetcher function', function () {
            var service = {my: 'service'},
                provider = sinon.stub().returns(service);
            container.defineService('my.service', provider);

            expect(container.getServiceFetcher()).to.equal(container.getServiceFetcher());
        });
    });

    describe('getServiceProviders()', function () {
        it('should return only the providers for the specified service IDs', function () {
            var provider1 = sinon.stub(),
                provider2 = sinon.stub(),
                provider3 = sinon.stub(),
                result;
            container.defineService('service.1', provider1);
            container.defineService('service.2', provider2);
            container.defineService('service.3', provider3);

            result = container.getServiceProviders(['service.1', 'service.3']);

            expect(result).to.deep.equal({
                'service.1': provider1,
                'service.3': provider3
            });
        });
    });

    describe('hasService()', function () {
        it('should return true when a service is defined but not yet instantiated', function () {
            container.defineService('my.service', sinon.stub());

            expect(container.hasService('my.service')).to.be.true;
        });

        it('should return true when a service is not defined but has been set', function () {
            container.setService('my.service', {my: 'service'});

            expect(container.hasService('my.service')).to.be.true;
        });

        it('should return false when a service is neither defined nor been set', function () {
            expect(container.hasService('some.undefined.service')).to.be.false;
        });
    });

    describe('setService()', function () {
        it('should specify a service\'s instantiated object value on the container', function () {
            var service = {my: 'service'};

            container.setService('my.service', service);

            expect(container.getService('my.service')).to.equal(service);
        });
    });
});
