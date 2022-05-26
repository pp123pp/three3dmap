function defaultValue<U>(a: any, b: U): U {
    if (a !== undefined && a !== null) {
        return a;
    }
    return b;
}

defaultValue.EMPTY_OBJECT = Object.freeze({}) as any;

export default defaultValue;
