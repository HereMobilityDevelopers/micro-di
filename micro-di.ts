/*

MIT License

Copyright (c) 2020 Here Mobility

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

const resolvers: { [key: string]: () => any } = {};

function getResolver<T>(token: Designator<T> | string) {
  if (typeof token === "string") return resolvers[token] as () => T;
  return token.prototype.$dependencyResolver as () => T;
}

function setResolver<T, R>(token: Designator<T> | string, resolver: () => R) {
  if (typeof token === "string") resolvers[token] = resolver;
  else token.prototype.$dependencyResolver = resolver;
}

function resolveOnce<T, C>(token: Designator<T> | string, constructor: () => C) {
  return () => {
    const instance = constructor();
    OverrideResolver(token, () => instance);
    return instance;
  };
}

/* An interface wrapper for constructable type */
export interface Designator<T> {
  new (...args: any[]): T;
}

/* Registers a resolver associated with the specified class or string token */
export function RegisterResolver<T, R>(token: Designator<T> | string, resolver: () => R) {
  if (!getResolver(token)) setResolver(token, resolver);
}

export function OverrideResolver<T, R>(token: Designator<T> | string, resolver: () => R) {
  setResolver(token, resolver);
}

/*
 * Registers an instance associated with the specified class or string token.
 * Provided constructor will be called first time the dependency accessed and
 * constructed instance will be returned on any subsequent resolution.
 */
export function RegisterInstance<T, C>(token: Designator<T> | string, constructor: () => C) {
  if (!getResolver(token)) {
    setResolver(token, resolveOnce(token, constructor));
  }
}

export function OverrideInstance<T, C>(token: Designator<T> | string, constructor: () => C) {
  setResolver(token, resolveOnce(token, constructor));
}

/* Resolves an instance associated with specified dependency class or string token */
export function ResolveDependency<T>(token: Designator<T> | string): T {
  return getResolver(token)();
}

/* A class decorator that registers designated class as an injectable dependency. */
export function Dependency(resolver?: () => any) {
  return function<T>(target: Designator<T>) {
    RegisterResolver(target, resolver || (() => new target()));
  };
}

/*
 * A class decorator that registers designated class as an injectable singleton.
 * Provided constructor will be called first time the dependency accessed and
 * constructed instance will be returned on any subsequent resolution.
 */
export function Singleton(constructor?: () => any) {
  return function<T>(target: Designator<T>) {
    RegisterInstance(target, constructor || (() => new target()));
  };
}

/*
 * A property decorator that resolves and injects the resolved instance
 * of specified dependency to designated property.
 */
export function Inject<T>(token: Designator<T> | string) {
  return (target: Object, property: string | symbol) => {
    Object.defineProperty(target, property, {
      get: () => ResolveDependency(token),
      enumerable: true,
      configurable: true
    });
  };
}
