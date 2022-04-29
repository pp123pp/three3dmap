/**
 * Stores information for making a request. In general this does not need to be constructed directly.
 *
 * @alias Request
 * @constructor
 *
 * @param {Object} [options] An object with the following properties:
 * @param {Boolean} [options.url] The url to request.
 * @param {Request~RequestCallback} [options.requestFunction] The function that makes the actual data request.
 * @param {Request~CancelCallback} [options.cancelFunction] The function that is called when the request is cancelled.
 * @param {Request~PriorityCallback} [options.priorityFunction] The function that is called to update the request's priority, which occurs once per frame.
 * @param {Number} [options.priority=0.0] The initial priority of the request.
 * @param {Boolean} [options.throttle=false] Whether to throttle and prioritize the request. If false, the request will be sent immediately. If true, the request will be throttled and sent based on priority.
 * @param {Boolean} [options.throttleByServer=false] Whether to throttle the request by server.
 * @param {RequestType} [options.type=RequestType.OTHER] The type of request.
 */

import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { RequestState } from './RequestState';
import { RequestType } from './RequestType';

class Request {
    url?: string;
    /**
     * The function that makes the actual data request.
     *
     * @type {Request.RequestCallback}
     */
    requestFunction?: Promise<unknown>;

    /**
     * The function that is called when the request is cancelled.
     *
     * @type {Request.CancelCallback}
     */
    cancelFunction?: (object?: any) => any;

    /**
     * The function that is called to update the request's priority, which occurs once per frame.
     *
     * @type {Request.PriorityCallback}
     */
    priorityFunction?: (object?: any) => any;

    /**
     * Priority is a unit-less value where lower values represent higher priority.
     * For world-based objects, this is usually the distance from the camera.
     * A request that does not have a priority function defaults to a priority of 0.
     *
     * If priorityFunction is defined, this value is updated every frame with the result of that call.
     *
     * @type {Number}
     * @default 0.0
     */
    priority = 0.0;

    /**
     * Whether to throttle and prioritize the request. If false, the request will be sent immediately. If true, the
     * request will be throttled and sent based on priority.
     *
     * @type {Boolean}
     * @readonly
     *
     * @default false
     */
    throttle: boolean;

    /**
     * Whether to throttle the request by server. Browsers typically support about 6-8 parallel connections
     * for HTTP/1 servers, and an unlimited amount of connections for HTTP/2 servers. Setting this value
     * to <code>true</code> is preferable for requests going through HTTP/1 servers.
     *
     * @type {Boolean}
     * @readonly
     *
     * @default false
     */
    throttleByServer: boolean;

    /**
     * Type of request.
     *
     * @type {RequestType}
     * @readonly
     *
     * @default RequestType.OTHER
     */
    type: RequestType;

    /**
     * A key used to identify the server that a request is going to. It is derived from the url's authority and scheme.
     *
     * @type {String}
     *
     * @private
     */
    serverKey?: string;
    /**
     * The current state of the request.
     *
     * @type {RequestState}
     * @readonly
     */
    state = RequestState.UNISSUED;

    /**
     * The requests's deferred promise.
     *
     * @type {Object}
     *
     * @private
     */
    deferred?: any;

    /**
     * Whether the request was explicitly cancelled.
     *
     * @type {Boolean}
     *
     * @private
     */
    cancelled = false;
    constructor(
        options: {
            [name: string]: any;
            url?: string;
            requestFunction?: any;
            cancelFunction?: any;
            priorityFunction?: any;
            priority?: number;
            throttle?: boolean;
            throttleByServer?: boolean;
            type?: RequestType;
        } = {}
    ) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        const throttleByServer = defaultValue(options.throttleByServer, false);
        const throttle = defaultValue(options.throttle, false);

        /**
         * The URL to request.
         *
         * @type {String}
         */
        this.url = options.url;

        this.requestFunction = options.requestFunction;

        this.cancelFunction = options.cancelFunction;

        this.priorityFunction = options.priorityFunction;

        this.priority = defaultValue(options.priority, 0.0);

        this.throttle = throttle;

        this.throttleByServer = throttleByServer;

        this.type = defaultValue(options.type, RequestType.OTHER);

        this.serverKey = undefined;

        this.deferred = undefined;
    }

    /**
     * Mark the request as cancelled.
     *
     * @private
     */
    cancel(): void {
        this.cancelled = true;
    }

    /**
     * Duplicates a Request instance.
     *
     * @param {Request} [result] The object onto which to store the result.
     *
     * @returns {Request} The modified result parameter or a new Resource instance if one was not provided.
     */
    clone(result?: any): Request {
        if (!defined(result)) {
            return new Request(this);
        }

        result.url = this.url;
        result.requestFunction = this.requestFunction;
        result.cancelFunction = this.cancelFunction;
        result.priorityFunction = this.priorityFunction;
        result.priority = this.priority;
        result.throttle = this.throttle;
        result.throttleByServer = this.throttleByServer;
        result.type = this.type;
        result.serverKey = this.serverKey;

        // These get defaulted because the cloned request hasn't been issued
        result.state = RequestState.UNISSUED;
        result.deferred = undefined;
        result.cancelled = false;

        return result;
    }
}

export { Request };
