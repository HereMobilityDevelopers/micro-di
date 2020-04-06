export type Resolver<T> = (...args: any[]) => T;

const resolvers: { [key: string]: Resolver<any> } = {};

function getResolver<T>(token: Constructible<T> | string) {
  if (typeof token === "string") return resolvers[token] as Resolver<T>;
  return token.prototype.$dependencyResolver as Resolver<T>;
}

function setResolver<T, R>(token: Constructible<T> | string, resolver: Resolver<R>) {
  if (typeof token === "string") resolvers[token] = resolver;
  else token.prototype.$dependencyResolver = resolver;
}

function resolveOnce<T, C>(token: Constructible<T> | string, resolve: Resolver<C>) {
  return () => {
    const instance = resolve();
    OverrideResolver(token, () => instance);
    return instance;
  };
}

/* An interface wrapper for constructable type */
export interface Constructible<T> {
  new (...args: any[]): T;
}

/* Registers a resolver associated with the specified class or string token */
export function RegisterResolver<T>(token: Constructible<T> | string, resolver: Resolver<T>) {
  if (!getResolver(token)) setResolver(token, resolver);
}

export function OverrideResolver<T, R>(token: Constructible<T> | string, resolver: Resolver<R>) {
  setResolver(token, resolver);
}

/*
 * Registers an instance associated with the specified class or string token.
 * Provided constructor will be called first time the dependency accessed and
 * constructed instance will be returned on any subsequent resolution.
 */
export function RegisterSingleton<T>(token: Constructible<T> | string, resolver: Resolver<T>) {
  if (!getResolver(token)) {
    setResolver(token, resolveOnce(token, resolver));
  }
}

export function OverrideSingleton<T, R>(token: Constructible<T> | string, resolver: Resolver<R>) {
  setResolver(token, resolveOnce(token, resolver));
}

/* Resolves an instance associated with specified dependency class or string token */
export function ResolveDependency<T>(token: Constructible<T> | string, ...args: any[]) {
  const resolve: Resolver<T> = getResolver(token);
  if (resolve) return resolve(...args);
  throw Error(`Trying to resolve unregistered token: ${token}`);
}

/* A class decorator that registers designated class as an injectable dependency. */
export function Dependency(resolver?: Resolver<any>) {
  return function<T>(target: Constructible<T>) {
    RegisterResolver(target, resolver || ((...args) => new target(...args)));
  };
}

/*
 * A class decorator that registers designated class as an injectable singleton.
 * Provided constructor will be called first time the dependency accessed and
 * constructed instance will be returned on any subsequent resolution.
 */
export function Singleton(resolver?: Resolver<any>) {
  return function<T>(target: Constructible<T>) {
    RegisterSingleton(target, resolver || ((...args) => new target(...args)));
  };
}

/*
 * A property decorator that resolves and injects the resolved instance
 * of specified dependency to designated property.
 */
export function Inject<T>(token: Constructible<T> | string, ...args: any[]) {
  return (target: Object, property: string | symbol) => {
    Object.defineProperty(target, property, {
      get: () => ResolveDependency(token, args),
      enumerable: true,
      configurable: true
    });
  };
}
