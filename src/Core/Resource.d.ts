import Uri from '../ThirdParty/Uri';
import appendForwardSlash from './appendForwardSlash';
import Check from './Check';
import clone from './clone';
import combine from './combine';
import defaultValue from './defaultValue';
import defer from './defer';
import defined from './defined';
import DeveloperError from './DeveloperError';
import getAbsoluteUri from './getAbsoluteUri';
import getBaseUri from './getBaseUri';
import getExtensionFromUri from './getExtensionFromUri';
import getImagePixels from './getImagePixels';
import isBlobUri from './isBlobUri';
import isCrossOriginUrl from './isCrossOriginUrl';
import isDataUri from './isDataUri';
import loadAndExecuteScript from './loadAndExecuteScript';
import CesiumMath from './Math';
import objectToQuery from './objectToQuery';
import queryToObject from './queryToObject';
import Request from './Request';
import RequestErrorEvent from './RequestErrorEvent';
import RequestScheduler from './RequestScheduler';
import RequestState from './RequestState';
import RuntimeError from './RuntimeError';
import TrustedServers from './TrustedServers';

/**
 * A resource that includes the location and any other parameters we need to retrieve it or create derived resources. It also provides the ability to retry requests.
 * @example
 * function refreshTokenRetryCallback(resource, error) {
 *   if (error.statusCode === 403) {
 *     // 403 status code means a new token should be generated
 *     return getNewAccessToken()
 *       .then(function(token) {
 *         resource.queryParameters.access_token = token;
 *         return true;
 *       })
 *       .catch(function() {
 *         return false;
 *       });
 *   }
 *
 *   return false;
 * }
 *
 * const resource = new Resource({
 *    url: 'http://server.com/path/to/resource.json',
 *    proxy: new DefaultProxy('/proxy/'),
 *    headers: {
 *      'X-My-Header': 'valueOfHeader'
 *    },
 *    queryParameters: {
 *      'access_token': '123-435-456-000'
 *    },
 *    retryCallback: refreshTokenRetryCallback,
 *    retryAttempts: 1
 * });
 * @param options - A url or an object with the following properties
 * @param options.url - The url of the resource.
 * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
 * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
 * @param [options.headers = {}] - Additional HTTP headers that will be sent.
 * @param [options.proxy] - A proxy to be used when loading the resource.
 * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
 * @param [options.request] - A Request object that will be used. Intended for internal use only.
 */
export default class Resource {
    constructor(options: { url: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request });
    /**
     * Additional HTTP headers that will be sent with the request.
     */
    headers: any;
    /**
     * A Request object that will be used. Intended for internal use only.
     */
    request: Request;
    /**
     * A proxy to be used when loading the resource.
     */
    proxy: Proxy;
    /**
     * Function to call when a request for this resource fails. If it returns true or a Promise that resolves to true, the request will be retried.
     */
    retryCallback: (...params: any[]) => any;
    /**
     * The number of times the retryCallback should be called before giving up.
     */
    retryAttempts: number;
    /**
     * Returns true if blobs are supported.
     */
    static readonly isBlobSupported: boolean;
    /**
     * Query parameters appended to the url.
     */
    readonly queryParameters: any;
    /**
     * The key/value pairs used to replace template parameters in the url.
     */
    readonly templateValues: any;
    /**
     * The url to the resource with template values replaced, query string appended and encoded by proxy if one was set.
     */
    url: string;
    /**
     * The file extension of the resource.
     */
    readonly extension: string;
    /**
     * True if the Resource refers to a data URI.
     */
    isDataUri: boolean;
    /**
     * True if the Resource refers to a blob URI.
     */
    isBlobUri: boolean;
    /**
     * True if the Resource refers to a cross origin URL.
     */
    isCrossOriginUrl: boolean;
    /**
     * True if the Resource has request headers. This is equivalent to checking if the headers property has any keys.
     */
    hasHeaders: boolean;
    /**
     * Override Object#toString so that implicit string conversion gives the
     * complete URL represented by this Resource.
     * @returns The URL represented by this Resource
     */
    toString(): string;
    /**
     * Returns the url, optional with the query string and processed by a proxy.
     * @param [query = false] - If true, the query string is included.
     * @param [proxy = false] - If true, the url is processed by the proxy object, if defined.
     * @returns The url with all the requested components.
     */
    getUrlComponent(query?: boolean, proxy?: boolean): string;
    /**
     * Combines the specified object and the existing query parameters. This allows you to add many parameters at once,
     *  as opposed to adding them one at a time to the queryParameters property. If a value is already set, it will be replaced with the new value.
     * @param params - The query parameters
     * @param [useAsDefault = false] - If true the params will be used as the default values, so they will only be set if they are undefined.
     */
    setQueryParameters(params: any, useAsDefault?: boolean): void;
    /**
     * Combines the specified object and the existing query parameters. This allows you to add many parameters at once,
     *  as opposed to adding them one at a time to the queryParameters property.
     * @param params - The query parameters
     */
    appendQueryParameters(params: any): void;
    /**
     * Combines the specified object and the existing template values. This allows you to add many values at once,
     *  as opposed to adding them one at a time to the templateValues property. If a value is already set, it will become an array and the new value will be appended.
     * @param template - The template values
     * @param [useAsDefault = false] - If true the values will be used as the default values, so they will only be set if they are undefined.
     */
    setTemplateValues(template: any, useAsDefault?: boolean): void;
    /**
     * Returns a resource relative to the current instance. All properties remain the same as the current instance unless overridden in options.
     * @param options - An object with the following properties
     * @param [options.url] - The url that will be resolved relative to the url of the current instance.
     * @param [options.queryParameters] - An object containing query parameters that will be combined with those of the current instance.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}). These will be combined with those of the current instance.
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The function to call when loading the resource fails.
     * @param [options.retryAttempts] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @param [options.preserveQueryParameters = false] - If true, this will keep all query parameters from the current resource and derived resource. If false, derived parameters will replace those of the current resource.
     * @returns The resource derived from the current one.
     */
    getDerivedResource(options: { url?: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request; preserveQueryParameters?: boolean }): Resource;
    /**
     * Duplicates a Resource instance.
     * @param [result] - The object onto which to store the result.
     * @returns The modified result parameter or a new Resource instance if one was not provided.
     */
    clone(result?: Resource): Resource;
    /**
     * Returns the base path of the Resource.
     * @param [includeQuery = false] - Whether or not to include the query string and fragment form the uri
     * @returns The base URI of the resource
     */
    getBaseUri(includeQuery?: boolean): string;
    /**
     * Appends a forward slash to the URL.
     */
    appendForwardSlash(): void;
    /**
     * Asynchronously loads the resource as raw binary data.  Returns a promise that will resolve to
     * an ArrayBuffer once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * @example
     * // load a single URL asynchronously
     * resource.fetchArrayBuffer().then(function(arrayBuffer) {
     *     // use the data
     * }).catch(function(error) {
     *     // an error occurred
     * });
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    fetchArrayBuffer(): Promise<ArrayBuffer> | undefined;
    /**
     * Creates a Resource and calls fetchArrayBuffer() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static fetchArrayBuffer(options: { url: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request }): Promise<ArrayBuffer> | undefined;
    /**
     * Asynchronously loads the given resource as a blob.  Returns a promise that will resolve to
     * a Blob once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * @example
     * // load a single URL asynchronously
     * resource.fetchBlob().then(function(blob) {
     *     // use the data
     * }).catch(function(error) {
     *     // an error occurred
     * });
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    fetchBlob(): Promise<Blob> | undefined;
    /**
     * Creates a Resource and calls fetchBlob() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static fetchBlob(options: { url: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request }): Promise<Blob> | undefined;
    /**
     * Asynchronously loads the given image resource.  Returns a promise that will resolve to
     * an {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap|ImageBitmap} if <code>preferImageBitmap</code> is true and the browser supports <code>createImageBitmap</code> or otherwise an
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement|Image} once loaded, or reject if the image failed to load.
     * @example
     * // load a single image asynchronously
     * resource.fetchImage().then(function(image) {
     *     // use the loaded image
     * }).catch(function(error) {
     *     // an error occurred
     * });
     *
     * // load several images in parallel
     * Promise.all([resource1.fetchImage(), resource2.fetchImage()]).then(function(images) {
     *     // images is an array containing all the loaded images
     * });
     * @param [options] - An object with the following properties.
     * @param [options.preferBlob = false] - If true, we will load the image via a blob.
     * @param [options.preferImageBitmap = false] - If true, image will be decoded during fetch and an <code>ImageBitmap</code> is returned.
     * @param [options.flipY = false] - If true, image will be vertically flipped during decode. Only applies if the browser supports <code>createImageBitmap</code>.
     * @param [options.skipColorSpaceConversion = false] - If true, any custom gamma or color profiles in the image will be ignored. Only applies if the browser supports <code>createImageBitmap</code>.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    fetchImage(options?: { preferBlob?: boolean; preferImageBitmap?: boolean; flipY?: boolean; skipColorSpaceConversion?: boolean }): Promise<ImageBitmap> | Promise<HTMLImageElement> | undefined;
    /**
     * Creates a Resource and calls fetchImage() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.flipY = false] - Whether to vertically flip the image during fetch and decode. Only applies when requesting an image and the browser supports <code>createImageBitmap</code>.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @param [options.preferBlob = false] - If true, we will load the image via a blob.
     * @param [options.preferImageBitmap = false] - If true, image will be decoded during fetch and an <code>ImageBitmap</code> is returned.
     * @param [options.skipColorSpaceConversion = false] - If true, any custom gamma or color profiles in the image will be ignored. Only applies when requesting an image and the browser supports <code>createImageBitmap</code>.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static fetchImage(options: { url: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; flipY?: boolean; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request; preferBlob?: boolean; preferImageBitmap?: boolean; skipColorSpaceConversion?: boolean }): Promise<ImageBitmap> | Promise<HTMLImageElement> | undefined;
    /**
     * Asynchronously loads the given resource as text.  Returns a promise that will resolve to
     * a String once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * @example
     * // load text from a URL, setting a custom header
     * const resource = new Resource({
     *   url: 'http://someUrl.com/someJson.txt',
     *   headers: {
     *     'X-Custom-Header' : 'some value'
     *   }
     * });
     * resource.fetchText().then(function(text) {
     *     // Do something with the text
     * }).catch(function(error) {
     *     // an error occurred
     * });
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    fetchText(): Promise<string> | undefined;
    /**
     * Creates a Resource and calls fetchText() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static fetchText(options: { url: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request }): Promise<string> | undefined;
    /**
     * Asynchronously loads the given resource as JSON.  Returns a promise that will resolve to
     * a JSON object once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled. This function
     * adds 'Accept: application/json,&#42;&#47;&#42;;q=0.01' to the request headers, if not
     * already specified.
     * @example
     * resource.fetchJson().then(function(jsonData) {
     *     // Do something with the JSON object
     * }).catch(function(error) {
     *     // an error occurred
     * });
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    fetchJson(): Promise<any> | undefined;
    /**
     * Creates a Resource and calls fetchJson() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static fetchJson(options: { url: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request }): Promise<any> | undefined;
    /**
     * Asynchronously loads the given resource as XML.  Returns a promise that will resolve to
     * an XML Document once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * @example
     * // load XML from a URL, setting a custom header
     * Cesium.loadXML('http://someUrl.com/someXML.xml', {
     *   'X-Custom-Header' : 'some value'
     * }).then(function(document) {
     *     // Do something with the document
     * }).catch(function(error) {
     *     // an error occurred
     * });
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    fetchXML(): Promise<XMLDocument> | undefined;
    /**
     * Creates a Resource and calls fetchXML() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static fetchXML(options: { url: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request }): Promise<XMLDocument> | undefined;
    /**
     * Requests a resource using JSONP.
     * @example
     * // load a data asynchronously
     * resource.fetchJsonp().then(function(data) {
     *     // use the loaded data
     * }).catch(function(error) {
     *     // an error occurred
     * });
     * @param [callbackParameterName = 'callback'] - The callback parameter name that the server expects.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    fetchJsonp(callbackParameterName?: string): Promise<any> | undefined;
    /**
     * Creates a Resource from a URL and calls fetchJsonp() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @param [options.callbackParameterName = 'callback'] - The callback parameter name that the server expects.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static fetchJsonp(options: { url: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request; callbackParameterName?: string }): Promise<any> | undefined;
    /**
     * Asynchronously loads the given resource.  Returns a promise that will resolve to
     * the result once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled. It's recommended that you use
     * the more specific functions eg. fetchJson, fetchBlob, etc.
     * @example
     * resource.fetch()
     *   .then(function(body) {
     *       // use the data
     *   }).catch(function(error) {
     *       // an error occurred
     *   });
     * @param [options] - Object with the following properties:
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.headers] - Additional HTTP headers to send with the request, if any.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    fetch(options?: { responseType?: string; headers?: any; overrideMimeType?: string }): Promise<any> | undefined;
    /**
     * Creates a Resource from a URL and calls fetch() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static fetch(options: { url: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request; responseType?: string; overrideMimeType?: string }): Promise<any> | undefined;
    /**
     * Asynchronously deletes the given resource.  Returns a promise that will resolve to
     * the result once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * @example
     * resource.delete()
     *   .then(function(body) {
     *       // use the data
     *   }).catch(function(error) {
     *       // an error occurred
     *   });
     * @param [options] - Object with the following properties:
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.headers] - Additional HTTP headers to send with the request, if any.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    delete(options?: { responseType?: string; headers?: any; overrideMimeType?: string }): Promise<any> | undefined;
    /**
     * Creates a Resource from a URL and calls delete() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param [options.data] - Data that is posted with the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static delete(options: { url: string; data?: any; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request; responseType?: string; overrideMimeType?: string }): Promise<any> | undefined;
    /**
     * Asynchronously gets headers the given resource.  Returns a promise that will resolve to
     * the result once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * @example
     * resource.head()
     *   .then(function(headers) {
     *       // use the data
     *   }).catch(function(error) {
     *       // an error occurred
     *   });
     * @param [options] - Object with the following properties:
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.headers] - Additional HTTP headers to send with the request, if any.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    head(options?: { responseType?: string; headers?: any; overrideMimeType?: string }): Promise<any> | undefined;
    /**
     * Creates a Resource from a URL and calls head() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static head(options: { url: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request; responseType?: string; overrideMimeType?: string }): Promise<any> | undefined;
    /**
     * Asynchronously gets options the given resource.  Returns a promise that will resolve to
     * the result once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * @example
     * resource.options()
     *   .then(function(headers) {
     *       // use the data
     *   }).catch(function(error) {
     *       // an error occurred
     *   });
     * @param [options] - Object with the following properties:
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.headers] - Additional HTTP headers to send with the request, if any.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    options(options?: { responseType?: string; headers?: any; overrideMimeType?: string }): Promise<any> | undefined;
    /**
     * Creates a Resource from a URL and calls options() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static options(options: { url: string; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request; responseType?: string; overrideMimeType?: string }): Promise<any> | undefined;
    /**
     * Asynchronously posts data to the given resource.  Returns a promise that will resolve to
     * the result once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * @example
     * resource.post(data)
     *   .then(function(result) {
     *       // use the result
     *   }).catch(function(error) {
     *       // an error occurred
     *   });
     * @param data - Data that is posted with the resource.
     * @param [options] - Object with the following properties:
     * @param [options.data] - Data that is posted with the resource.
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.headers] - Additional HTTP headers to send with the request, if any.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    post(
        data: any,
        options?: {
            data?: any;
            responseType?: string;
            headers?: any;
            overrideMimeType?: string;
        }
    ): Promise<any> | undefined;
    /**
     * Creates a Resource from a URL and calls post() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param options.data - Data that is posted with the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static post(options: { url: string; data: any; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request; responseType?: string; overrideMimeType?: string }): Promise<any> | undefined;
    /**
     * Asynchronously puts data to the given resource.  Returns a promise that will resolve to
     * the result once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * @example
     * resource.put(data)
     *   .then(function(result) {
     *       // use the result
     *   }).catch(function(error) {
     *       // an error occurred
     *   });
     * @param data - Data that is posted with the resource.
     * @param [options] - Object with the following properties:
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.headers] - Additional HTTP headers to send with the request, if any.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    put(
        data: any,
        options?: {
            responseType?: string;
            headers?: any;
            overrideMimeType?: string;
        }
    ): Promise<any> | undefined;
    /**
     * Creates a Resource from a URL and calls put() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param options.data - Data that is posted with the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static put(options: { url: string; data: any; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request; responseType?: string; overrideMimeType?: string }): Promise<any> | undefined;
    /**
     * Asynchronously patches data to the given resource.  Returns a promise that will resolve to
     * the result once loaded, or reject if the resource failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * @example
     * resource.patch(data)
     *   .then(function(result) {
     *       // use the result
     *   }).catch(function(error) {
     *       // an error occurred
     *   });
     * @param data - Data that is posted with the resource.
     * @param [options] - Object with the following properties:
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.headers] - Additional HTTP headers to send with the request, if any.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    patch(
        data: any,
        options?: {
            responseType?: string;
            headers?: any;
            overrideMimeType?: string;
        }
    ): Promise<any> | undefined;
    /**
     * Creates a Resource from a URL and calls patch() on it.
     * @param options - A url or an object with the following properties
     * @param options.url - The url of the resource.
     * @param options.data - Data that is posted with the resource.
     * @param [options.queryParameters] - An object containing query parameters that will be sent when retrieving the resource.
     * @param [options.templateValues] - Key/Value pairs that are used to replace template values (eg. {x}).
     * @param [options.headers = {}] - Additional HTTP headers that will be sent.
     * @param [options.proxy] - A proxy to be used when loading the resource.
     * @param [options.retryCallback] - The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param [options.retryAttempts = 0] - The number of times the retryCallback should be called before giving up.
     * @param [options.request] - A Request object that will be used. Intended for internal use only.
     * @param [options.responseType] - The type of response.  This controls the type of item returned.
     * @param [options.overrideMimeType] - Overrides the MIME type returned by the server.
     * @returns a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     */
    static patch(options: { url: string; data: any; queryParameters?: any; templateValues?: any; headers?: any; proxy?: Proxy; retryCallback?: Resource.RetryCallback; retryAttempts?: number; request?: Request; responseType?: string; overrideMimeType?: string }): Promise<any> | undefined;
    /**
     * A resource instance initialized to the current browser location
     */
    static readonly DEFAULT: Resource;

    static createIfNeeded(resource: Resource | string): Resource;
}
