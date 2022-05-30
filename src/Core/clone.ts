import defaultValue from './defaultValue';

/**
 * Clones an object, returning a new object containing the same properties.
 *
 * @exports clone
 *
 * @param {Object} object The object to clone.
 * @param {Boolean} [deep=false] If true, all properties will be deep cloned recursively.
 * @returns {Object} The cloned object.
 */
function clone(object: any, deep = false) {
    if (object === null || typeof object !== 'object') {
        return object;
    }

    deep = defaultValue(deep, false);

    const result = new object.constructor();
    for (const propertyName in object) {
        if (propertyName in object) {
            let value = object[propertyName];
            if (deep) {
                value = clone(value, deep);
            }
            result[propertyName] = value;
        }
    }

    return result;
}
export default clone;
