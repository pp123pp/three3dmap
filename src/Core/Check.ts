import defined from './defined';
import DeveloperError from './DeveloperError';

const Check: any = {};

Check.typeOf = {};

function getUndefinedErrorMessage(name: any) {
    return name + ' is required, actual value was undefined';
}

function getFailedTypeErrorMessage(actual: any, expected: any, name: any) {
    return 'Expected ' + name + ' to be typeof ' + expected + ', actual typeof was ' + actual;
}

Check.typeOf.func = function (name: any, test: any) {
    if (typeof test !== 'function') {
        throw new DeveloperError(getFailedTypeErrorMessage(typeof test, 'function', name));
    }
};

/**
 * Throws if test is not defined
 *
 * @param {String} name The name of the variable being tested
 * @param {*} test The value that is to be checked
 * @exception {DeveloperError} test must be defined
 */
Check.defined = function (name: any, test: any) {
    if (!defined(test)) {
        throw new DeveloperError(getUndefinedErrorMessage(name));
    }
};

/**
 * Throws if test is not typeof 'string'
 *
 * @param {String} name The name of the variable being tested
 * @param {*} test The value to test
 * @exception {DeveloperError} test must be typeof 'string'
 */
Check.typeOf.string = function (name: string, test: any) {
    if (typeof test !== 'string') {
        throw new DeveloperError(getFailedTypeErrorMessage(typeof test, 'string', name));
    }
};

/**
 * Throws if test is not typeof 'number'
 *
 * @param {String} name The name of the variable being tested
 * @param {*} test The value to test
 * @exception {DeveloperError} test must be typeof 'number'
 */
Check.typeOf.number = function (name: string, test: any) {
    if (typeof test !== 'number') {
        throw new DeveloperError(getFailedTypeErrorMessage(typeof test, 'number', name));
    }
};

/**
 * Throws if test is not typeof 'object'
 *
 * @param {String} name The name of the variable being tested
 * @param {*} test The value to test
 * @exception {DeveloperError} test must be typeof 'object'
 */
Check.typeOf.object = function (name: string, test: any) {
    if (typeof test !== 'object') {
        throw new DeveloperError(getFailedTypeErrorMessage(typeof test, 'object', name));
    }
};

/**
 * Throws if test is not typeof 'number' and less than limit
 *
 * @param {String} name The name of the variable being tested
 * @param {*} test The value to test
 * @param {Number} limit The limit value to compare against
 * @exception {DeveloperError} test must be typeof 'number' and less than limit
 */
Check.typeOf.number.lessThan = function (name: string, test: any, limit: number) {
    Check.typeOf.number(name, test);
    if (test >= limit) {
        throw new DeveloperError('Expected ' + name + ' to be less than ' + limit + ', actual value was ' + test);
    }
};

/**
 * Throws if test is not typeof 'number' and greater than or equal to limit
 *
 * @param {String} name The name of the variable being tested
 * @param {*} test The value to test
 * @param {Number} limit The limit value to compare against
 * @exception {DeveloperError} test must be typeof 'number' and greater than or equal to limit
 */
Check.typeOf.number.greaterThanOrEquals = function (name: string, test: any, limit: number) {
    Check.typeOf.number(name, test);
    if (test < limit) {
        throw new DeveloperError('Expected ' + name + ' to be greater than or equal to' + limit + ', actual value was ' + test);
    }
};

/**
 * Throws if test is not typeof 'number' and less than or equal to limit
 *
 * @param {String} name The name of the variable being tested
 * @param {*} test The value to test
 * @param {Number} limit The limit value to compare against
 * @exception {DeveloperError} test must be typeof 'number' and less than or equal to limit
 */
Check.typeOf.number.lessThanOrEquals = function (name: string, test: any, limit: number) {
    Check.typeOf.number(name, test);
    if (test > limit) {
        throw new DeveloperError('Expected ' + name + ' to be less than or equal to ' + limit + ', actual value was ' + test);
    }
};

export { Check };
