import Uri from '../ThirdParty/Uri.js';
import defaultValue from './defaultValue';
import defined from './defined';
import Ion from './Ion';
import Resource from './Resource';
import RuntimeError from './RuntimeError';

interface IEndpoint {
    accessToken: string;
    attributions: any[];
    type: string;
    url: string;
    externalType?: string;
    options?: any;
}

export default class IonResource extends Resource {
    _ionEndpoint: any;
    _ionEndpointDomain: any;
    _ionEndpointResource: any;
    _ionRoot: any;
    _pendingPromise: any;
    _credits: any;
    _isExternal: boolean;
    constructor(endpoint: IEndpoint, endpointResource: Resource) {
        let options;
        const externalType = endpoint.externalType;
        const isExternal = defined(externalType);

        if (!isExternal) {
            options = {
                url: endpoint.url,
                retryAttempts: 1,
                retryCallback: retryCallback,
            };
        } else if (externalType === '3DTILES' || externalType === 'STK_TERRAIN_SERVER') {
            // 3D Tiles and STK Terrain Server external assets can still be represented as an IonResource
            options = { url: (endpoint.options as any).url };
        } else {
            //External imagery assets have additional configuration that can't be represented as a Resource
            throw new RuntimeError('Ion.createResource does not support external imagery assets; use IonImageryProvider instead.');
        }

        // Resource.call(this as any, options);

        super(options);

        // The asset endpoint data returned from ion.
        this._ionEndpoint = endpoint;
        this._ionEndpointDomain = isExternal ? undefined : new Uri(endpoint.url).authority();

        // The endpoint resource to fetch when a new token is needed
        this._ionEndpointResource = endpointResource;

        // The primary IonResource from which an instance is derived
        this._ionRoot = undefined;

        // Shared promise for endpooint requests amd credits (only ever set on the root request)
        this._pendingPromise = undefined;
        this._credits = undefined;
        this._isExternal = isExternal;
    }

    static _createEndpointResource(assetId: number, options: { assetId: number; accessToken?: string; server?: string | Resource }): Resource {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        console.log(Ion.defaultServer);
        let server = defaultValue(options.server, Ion.defaultServer) as unknown as string | Resource;
        const accessToken = defaultValue(options.accessToken, Ion.defaultAccessToken) as string | Resource;
        server = Resource.createIfNeeded(server);

        const resourceOptions: any = {
            url: `v1/assets/${assetId}/endpoint`,
        };

        if (defined(accessToken)) {
            resourceOptions.queryParameters = { access_token: accessToken };
        }

        return server.getDerivedResource(resourceOptions);
    }

    static fromAssetId(assetId: number, options?: any): Promise<IonResource> {
        const endpointResource = IonResource._createEndpointResource(assetId, options);

        return (endpointResource.fetchJson() as Promise<any>).then(function (endpoint) {
            return new IonResource(endpoint, endpointResource);
        });
    }

    _makeRequest(options: any) {
        // Don't send ion access token to non-ion servers.
        if (this._isExternal || new Uri(this.url).authority() !== this._ionEndpointDomain) {
            return Resource.prototype._makeRequest.call(this, options);
        }

        if (!defined(options.headers)) {
            options.headers = {};
        }
        options.headers.Authorization = `Bearer ${this._ionEndpoint.accessToken}`;

        return Resource.prototype._makeRequest.call(this, options);
    }

    clone(result: any) {
        // We always want to use the root's information because it's the most up-to-date
        const ionRoot = defaultValue(this._ionRoot, this);

        if (!defined(result)) {
            result = new IonResource(ionRoot._ionEndpoint, ionRoot._ionEndpointResource);
        }

        result = Resource.prototype.clone.call(this, result);
        result._ionRoot = ionRoot;
        result._isExternal = this._isExternal;

        return result;
    }
}

function retryCallback(that: IonResource, error: any) {
    const ionRoot = defaultValue(that._ionRoot, that);
    const endpointResource = ionRoot._ionEndpointResource;

    // Image is not available in worker threads, so this avoids
    // a ReferenceError
    const imageDefined = typeof Image !== 'undefined';

    // We only want to retry in the case of invalid credentials (401) or image
    // requests(since Image failures can not provide a status code)
    if (!defined(error) || (error.statusCode !== 401 && !(imageDefined && error.target instanceof Image))) {
        return Promise.resolve(false);
    }

    // We use a shared pending promise for all derived assets, since they share
    // a common access_token.  If we're already requesting a new token for this
    // asset, we wait on the same promise.
    if (!defined(ionRoot._pendingPromise)) {
        ionRoot._pendingPromise = endpointResource
            .fetchJson()
            .then(function (newEndpoint: any) {
                //Set the token for root resource so new derived resources automatically pick it up
                ionRoot._ionEndpoint = newEndpoint;
                return newEndpoint;
            })
            .finally(function (newEndpoint: any) {
                // Pass or fail, we're done with this promise, the next failure should use a new one.
                ionRoot._pendingPromise = undefined;
                return newEndpoint;
            });
    }

    return ionRoot._pendingPromise.then(function (newEndpoint: any) {
        // Set the new token and endpoint for this resource
        that._ionEndpoint = newEndpoint;
        return true;
    });
}
