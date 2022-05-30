import defer from './defer';

/**
 * @private
 */
function loadAndExecuteScript(url: string) {
    const deferred = defer() as any;
    const script = document.createElement('script') as any;
    script.async = true;
    script.src = url;

    const head = document.getElementsByTagName('head')[0];
    script.onload = function () {
        script.onload = undefined;
        head.removeChild(script);
        deferred.resolve();
    };
    script.onerror = function (e: any) {
        deferred.reject(e);
    };

    head.appendChild(script);

    return deferred.promise;
}
export default loadAndExecuteScript;
