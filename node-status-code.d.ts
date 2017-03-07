declare module 'node-status-codes' {
    export {}
}

declare class URLSearchParamsFix {
    /** Constructor returning a URLSearchParams object. */
    constructor(init?: string| URLSearchParams);

    /**Appends a specified key/value pair as a new search parameter. */
    append(name: string, value: string): void

    /** Deletes the given search parameter, and its associated value, from the list of all search parameters. */
    delete(name: string): void;

    /** Returns an iterator allowing to go through all key/value pairs contained in this object. */
    entries(): IterableIterator<[string, string]>;

    /** Returns the first value associated to the given search parameter. */
    get(name: string): string;

    /** Returns all the values association with a given search parameter. */
    getAll(name: string): string[];

    /** Returns a Boolean indicating if such a search parameter exists. */
    has(name: string): boolean;

    /** Returns an iterator allowing to go through all keys of the key/value pairs contained in this object. */
    keys(): IterableIterator<string>;

    /** Sets the value associated to a given search parameter to the given value. If there were several values, delete the others. */
    set(name: string, value: string): void;

    /** Returns a string containg a query string suitable for use in a URL. */
    toString(): string;

    /** Returns an iterator allowing to go through all values of the key/ value pairs contained in this object. */
    values(): IterableIterator<string>;

     /** Iterator */
    [Symbol.iterator](): IterableIterator<number>;
}
