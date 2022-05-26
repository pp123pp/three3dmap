import { URI as Uri } from '../ThirdParty/Uri';
import defaultValue from './defaultValue';
import defer from './defer';
import defined from './defined';
import Emit from './Emit';
import { Heap } from './Heap';
import isBlobUri from './isBlobUri';
import isDataUri from './isDataUri';
import { Request } from './Request';
import { RequestState } from './RequestState';

function sortRequests(a: any, b: any) {
    return a.priority - b.priority;
}

interface IStatistics {
    numberOfAttemptedRequests: number;
    numberOfActiveRequests: number;
    numberOfCancelledRequests: number;
    numberOfCancelledActiveRequests: number;
    numberOfFailedRequests: number;
    numberOfActiveRequestsEver: number;
    lastNumberOfActiveRequests: number;
}

const statistics: IStatistics = {
    numberOfAttemptedRequests: 0,
    numberOfActiveRequests: 0,
    numberOfCancelledRequests: 0,
    numberOfCancelledActiveRequests: 0,
    numberOfFailedRequests: 0,
    numberOfActiveRequestsEver: 0,
    lastNumberOfActiveRequests: 0,
};

let priorityHeapLength = 20;
const requestHeap = new Heap({
    comparator: sortRequests,
});
requestHeap.maximumLength = priorityHeapLength;
requestHeap.reserve(priorityHeapLength);

const activeRequests: any[] = [];
const numberOfActiveRequestsByServer: any = {};

const pageUri = typeof document !== 'undefined' ? new Uri(document.location.href) : new Uri();

const requestCompletedEvent = new Emit();

export default class RequestScheduler {
    /**
     * The maximum number of simultaneous active requests. Un-throttled requests do not observe this limit.
     * @type {Number}
     * @default 50
     */
    static maximumRequests = 50;

    /**
     * The maximum number of simultaneous active requests per server. Un-throttled requests or servers specifically
     * listed in {@link requestsByServer} do not observe this limit.
     * @type {Number}
     * @default 6
     */
    static maximumRequestsPerServer = 6;

    /**
     * A per server key list of overrides to use for throttling instead of <code>maximumRequestsPerServer</code>
     * @type {Object}
     *
     * @example
     * static requestsByServer = {
     *   'api.cesium.com:443': 18,
     *   'assets.cesium.com:443': 18
     * };
     */
    static requestsByServer: { [name: string]: number } = {
        'api.cesium.com:443': 18,
        'assets.cesium.com:443': 18,
    };

    /**
     * Specifies if the request scheduler should throttle incoming requests, or let the browser queue requests under its control.
     * @type {Boolean}
     * @default true
     */
    static throttleRequests = true;

    /**
     * When true, log statistics to the console every frame
     * @type {Boolean}
     * @default false
     * @private
     */
    static debugShowStatistics = false;

    /**
     * An event that's raised when a request is completed.  Event handlers are passed
     * the error object if the request fails.
     *
     * @type {Event}
     * @default Event()
     * @private
     */
    static requestCompletedEvent = requestCompletedEvent;

    /**
     * Returns the statistics used by the request scheduler.
     *
     * @memberof RequestScheduler
     *
     * @type Object
     * @readonly
     * @private
     */
    get statistics(): IStatistics {
        return statistics;
    }

    get priorityHeapLength(): number {
        return priorityHeapLength;
    }

    set priorityHeapLength(value) {
        // If the new length shrinks the heap, need to cancel some of the requests.
        // Since this value is not intended to be tweaked regularly it is fine to just cancel the high priority requests.
        if (value < priorityHeapLength) {
            while (requestHeap.length > value) {
                const request = requestHeap.pop();
                cancelRequest(request);
            }
        }
        priorityHeapLength = value;
        requestHeap.maximumLength = value;
        requestHeap.reserve(value);
    }

    /**
     * Check if there are open slots for a particular server key. If desiredRequests is greater than 1, this checks if the queue has room for scheduling multiple requests.
     * @param {String} serverKey The server key returned by {@link RequestScheduler.getServerKey}.
     * @param {Number} [desiredRequests=1] How many requests the caller plans to request
     * @return {Boolean} True if there are enough open slots for <code>desiredRequests</code> more requests.
     * @private
     */
    static serverHasOpenSlots(serverKey: string, desiredRequests = 1): boolean {
        desiredRequests = defaultValue(desiredRequests, 1);

        const maxRequests = defaultValue(RequestScheduler.requestsByServer[serverKey], RequestScheduler.maximumRequestsPerServer);
        const hasOpenSlotsServer = numberOfActiveRequestsByServer[serverKey] + desiredRequests <= maxRequests;

        return hasOpenSlotsServer;
    }

    /**
     * Check if the priority heap has open slots, regardless of which server they
     * are from. This is used in {@link Multiple3DTileContent} for determining when
     * all requests can be scheduled
     * @param {Number} desiredRequests The number of requests the caller intends to make
     * @return {Boolean} <code>true</code> if the heap has enough available slots to meet the desiredRequests. <code>false</code> otherwise.
     *
     * @private
     */
    static heapHasOpenSlots(desiredRequests: number): boolean {
        const hasOpenSlotsHeap = requestHeap.length + desiredRequests <= priorityHeapLength;
        return hasOpenSlotsHeap;
    }

    /**
     * Sort requests by priority and start requests.
     * @private
     */
    static update(): void {
        let i;
        let request;

        // Loop over all active requests. Cancelled, failed, or received requests are removed from the array to make room for new requests.
        let removeCount = 0;
        const activeLength = activeRequests.length;
        for (i = 0; i < activeLength; ++i) {
            request = activeRequests[i];
            if (request.cancelled) {
                // Request was explicitly cancelled
                cancelRequest(request);
            }
            if (request.state !== RequestState.ACTIVE) {
                // Request is no longer active, remove from array
                ++removeCount;
                continue;
            }
            if (removeCount > 0) {
                // Shift back to fill in vacated slots from completed requests
                activeRequests[i - removeCount] = request;
            }
        }
        activeRequests.length -= removeCount;

        // Update priority of issued requests and resort the heap
        const issuedRequests = requestHeap.internalArray;
        const issuedLength = requestHeap.length;
        for (i = 0; i < issuedLength; ++i) {
            updatePriority(issuedRequests[i]);
        }
        requestHeap.resort();

        // Get the number of open slots and fill with the highest priority requests.
        // Un-throttled requests are automatically added to activeRequests, so activeRequests.length may exceed maximumRequests
        const openSlots = Math.max(RequestScheduler.maximumRequests - activeRequests.length, 0);
        let filledSlots = 0;
        while (filledSlots < openSlots && requestHeap.length > 0) {
            // Loop until all open slots are filled or the heap becomes empty
            request = requestHeap.pop();
            if (request.cancelled) {
                // Request was explicitly cancelled
                cancelRequest(request);
                continue;
            }

            if (request.throttleByServer && !serverHasOpenSlots(request.serverKey)) {
                // Open slots are available, but the request is throttled by its server. Cancel and try again later.
                cancelRequest(request);
                continue;
            }

            startRequest(request);
            ++filledSlots;
        }

        updateStatistics();
    }

    /**
     * Issue a request. If request.throttle is false, the request is sent immediately. Otherwise the request will be
     * queued and sorted by priority before being sent.
     *
     * @param {Request} request The request object.
     *
     * @returns {Promise|undefined} A Promise for the requested data, or undefined if this request does not have high enough priority to be issued.
     */
    static request(request: Request): Promise<unknown> | undefined {
        if (isDataUri(request.url as string) || isBlobUri(request.url as string)) {
            requestCompletedEvent.raiseEvent();
            request.state = RequestState.RECEIVED;
            return (request.requestFunction as any)();
        }

        ++statistics.numberOfAttemptedRequests;

        if (!defined(request.serverKey)) {
            request.serverKey = RequestScheduler.getServerKey(request.url as string);
        }

        if (!RequestScheduler.throttleRequests || !request.throttle) {
            return startRequest(request);
        }

        if (activeRequests.length >= RequestScheduler.maximumRequests) {
            // Active requests are saturated. Try again later.
            return undefined;
        }

        if (request.throttleByServer && !serverHasOpenSlots(request.serverKey as string)) {
            // Server is saturated. Try again later.
            return undefined;
        }

        // Insert into the priority heap and see if a request was bumped off. If this request is the lowest
        // priority it will be returned.
        updatePriority(request);
        const removedRequest = requestHeap.insert(request);

        if (defined(removedRequest)) {
            if (removedRequest === request) {
                // Request does not have high enough priority to be issued
                return undefined;
            }
            // A previously issued request has been bumped off the priority heap, so cancel it
            cancelRequest(removedRequest);
        }

        return issueRequest(request);
    }

    /**
     * Get the server key from a given url.
     *
     * @param {String} url The url.
     * @returns {String} The server key.
     */
    static getServerKey(url: string): string {
        const uri = new Uri(url).resolve(pageUri);
        uri.normalize();
        let serverKey = uri.authority;
        if (!/:/.test(serverKey)) {
            // If the authority does not contain a port number, add port 443 for https or port 80 for http
            serverKey = serverKey + ':' + (uri.scheme === 'https' ? '443' : '80');
        }

        const length = numberOfActiveRequestsByServer[serverKey];
        if (!defined(length)) {
            numberOfActiveRequestsByServer[serverKey] = 0;
        }

        return serverKey;
    }
}

function issueRequest(request: Request) {
    if (request.state === RequestState.UNISSUED) {
        request.state = RequestState.ISSUED;
        request.deferred = defer();
    }
    return request.deferred.promise;
}

function getRequestReceivedFunction(request: Request) {
    return function (results: Request) {
        if (request.state === RequestState.CANCELLED) {
            // If the data request comes back but the request is cancelled, ignore it.
            return;
        }
        // explicitly set to undefined to ensure GC of request response data. See #8843
        const deferred = request.deferred;

        --statistics.numberOfActiveRequests;
        --numberOfActiveRequestsByServer[request.serverKey as string];
        requestCompletedEvent.raiseEvent();
        request.state = RequestState.RECEIVED;
        request.deferred = undefined;

        deferred.resolve(results);
    };
}

function getRequestFailedFunction(request: Request) {
    return function (error: Error) {
        if (request.state === RequestState.CANCELLED) {
            // If the data request comes back but the request is cancelled, ignore it.
            return;
        }
        ++statistics.numberOfFailedRequests;
        --statistics.numberOfActiveRequests;
        --numberOfActiveRequestsByServer[request.serverKey as string];
        requestCompletedEvent.raiseEvent(error);
        request.state = RequestState.FAILED;
        request.deferred.reject(error);
    };
}

function startRequest(request: Request) {
    const promise = issueRequest(request);
    request.state = RequestState.ACTIVE;
    activeRequests.push(request);
    ++statistics.numberOfActiveRequests;
    ++statistics.numberOfActiveRequestsEver;
    ++numberOfActiveRequestsByServer[request.serverKey as string];
    (request.requestFunction as any)().then(getRequestReceivedFunction(request)).catch(getRequestFailedFunction(request));
    return promise;
}

function cancelRequest(request: Request) {
    const active = request.state === RequestState.ACTIVE;
    request.state = RequestState.CANCELLED;
    ++statistics.numberOfCancelledRequests;
    // check that deferred has not been cleared since cancelRequest can be called
    // on a finished request, e.g. by clearForSpecs during tests
    if (defined(request.deferred)) {
        const deferred = request.deferred;
        request.deferred = undefined;
        deferred.reject();
    }

    if (active) {
        --statistics.numberOfActiveRequests;
        --numberOfActiveRequestsByServer[request.serverKey as string];
        ++statistics.numberOfCancelledActiveRequests;
    }

    if (defined(request.cancelFunction)) {
        (request as any).cancelFunction();
    }
}

function updatePriority(request: Request): void {
    if (defined(request.priorityFunction)) {
        request.priority = (request as any).priorityFunction();
    }
}

function updateStatistics() {
    if (!RequestScheduler.debugShowStatistics) {
        return;
    }

    if (statistics.numberOfActiveRequests === 0 && statistics.lastNumberOfActiveRequests > 0) {
        if (statistics.numberOfAttemptedRequests > 0) {
            console.log(`Number of attempted requests: ${statistics.numberOfAttemptedRequests}`);
            statistics.numberOfAttemptedRequests = 0;
        }

        if (statistics.numberOfCancelledRequests > 0) {
            console.log(`Number of cancelled requests: ${statistics.numberOfCancelledRequests}`);
            statistics.numberOfCancelledRequests = 0;
        }

        if (statistics.numberOfCancelledActiveRequests > 0) {
            console.log(`Number of cancelled active requests: ${statistics.numberOfCancelledActiveRequests}`);
            statistics.numberOfCancelledActiveRequests = 0;
        }

        if (statistics.numberOfFailedRequests > 0) {
            console.log(`Number of failed requests: ${statistics.numberOfFailedRequests}`);
            statistics.numberOfFailedRequests = 0;
        }
    }

    statistics.lastNumberOfActiveRequests = statistics.numberOfActiveRequests;
}

function serverHasOpenSlots(serverKey: string) {
    const maxRequests = defaultValue(RequestScheduler.requestsByServer[serverKey], RequestScheduler.maximumRequestsPerServer);
    return numberOfActiveRequestsByServer[serverKey] < maxRequests;
}
