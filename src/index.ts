const resolvers: { [key: string]: () => any } = {};

function getResolver<T>(token: Constructible<T> | string) {
  if (typeof token === "string") return resolvers[token] as () => T;
  return token.prototype.$dependencyResolver as () => T;
}

function setResolver<T, R>(token: Constructible<T> | string, resolver: () => R) {
  if (typeof token === "string") resolvers[token] = resolver;
  else token.prototype.$dependencyResolver = resolver;
}

function resolveOnce<T, C>(token: Constructible<T> | string, constructor: () => C) {
  return () => {
    const instance = constructor();
    OverrideResolver(token, () => instance);
    return instance;
  };
}

/* An interface wrapper for constructable type */
export interface Constructible<T> {
  new (...args: any[]): T;
}

/* Registers a resolver associated with the specified class or string token */
export function RegisterResolver<T>(token: Constructible<T> | string, resolver: () => T) {
  if (!getResolver(token)) setResolver(token, resolver);
}

export function OverrideResolver<T, R>(token: Constructible<T> | string, resolver: () => R) {
  setResolver(token, resolver);
}

/*
 * Registers an instance associated with the specified class or string token.
 * Provided constructor will be called first time the dependency accessed and
 * constructed instance will be returned on any subsequent resolution.
 */
export function RegisterInstance<T>(token: Constructible<T> | string, constructor: () => T) {
  if (!getResolver(token)) {
    setResolver(token, resolveOnce(token, constructor));
  }
}

export function OverrideInstance<T, R>(token: Constructible<T> | string, constructor: () => R) {
  setResolver(token, resolveOnce(token, constructor));
}

/* Resolves an instance associated with specified dependency class or string token */
export function ResolveDependency<T>(token: Constructible<T> | string) {
  const resolve = getResolver(token);
  if (resolve) return resolve();
  throw Error(`Trying to resolve unregistered token: ${token}`);
}

/* A class decorator that registers designated class as an injectable dependency. */
export function Dependency(resolver?: () => any) {
  return function<T>(target: Constructible<T>) {
    RegisterResolver(target, resolver || (() => new target()));
  };
}

/*
 * A class decorator that registers designated class as an injectable singleton.
 * Provided constructor will be called first time the dependency accessed and
 * constructed instance will be returned on any subsequent resolution.
 */
export function Singleton(constructor?: () => any) {
  return function<T>(target: Constructible<T>) {
    RegisterInstance(target, constructor || (() => new target()));
  };
}

/*
 * A property decorator that resolves and injects the resolved instance
 * of specified dependency to designated property.
 */
export function Inject<T>(token: Constructible<T> | string) {
  return (target: Object, property: string | symbol) => {
    Object.defineProperty(target, property, {
      get: () => ResolveDependency(token),
      enumerable: true,
      configurable: true
    });
  };
}
