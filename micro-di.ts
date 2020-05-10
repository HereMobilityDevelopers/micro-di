/**
 *  An interface wrapper for constructable type
 */
export interface Constructable<T> {
  new (...args: any[]): T;
}

/**
 * A generic resolver type
 */
export type Resolver<T> = (...args: any[]) => T;

export type Token<T> = Constructable<T> | string | symbol;

const resolvers = new Map<string | symbol, Resolver<any>>();

function getResolver<T, R>(token: Token<T>): Resolver<R> {
  if (typeof token === "string" || typeof token === "symbol")
    return resolvers[token] as Resolver<R>;
  return token.prototype.$dependencyResolver as Resolver<R>;
}

function setResolver<T, R>(token: Token<T>, resolver: Resolver<R>) {
  if (typeof token === "string" || typeof token === "symbol") resolvers[token] = resolver;
  else token.prototype.$dependencyResolver = resolver;
}

/**
 *  Registers a resolver associated with the specified class or string token
 */
export function RegisterResolver<T, R>(token: Token<T>, resolver: Resolver<R>) {
  if (!getResolver(token)) setResolver(token, resolver);
}

export function OverrideResolver<T, R>(token: Token<T>, resolver: Resolver<R>) {
  setResolver(token, resolver);
}

function resolveOnce<T, R>(token: Token<T>, resolve: Resolver<R>) {
  return (...args: any[]) => {
    const instance = resolve(...args);
    OverrideResolver(token, () => instance);
    return instance;
  };
}

/**
 * Registers an instance associated with the specified class or string token.
 * Provided constructor will be called first time the dependency accessed and
 * constructed instance will be returned on any subsequent resolution.
 */
export function RegisterSingleton<T, R>(token: Token<T>, resolver: Resolver<R>) {
  if (!getResolver(token)) {
    setResolver(token, resolveOnce(token, resolver));
  }
}

export function OverrideSingleton<T, R>(token: Token<T>, resolver: Resolver<R>) {
  setResolver(token, resolveOnce(token, resolver));
}

/**
 *  Resolves an instance associated with specified dependency class or string token
 */
export function Resolve<T>(token: Token<T>, ...args: any[]): T {
  const resolve: Resolver<T> = getResolver(token);
  if (resolve) return resolve(...args);
  throw Error(`Trying to resolve unregistered token: ${token.toString()}`);
}

/**
 *  Resolves an instance associated with specified dependency class or string token,
 *  and trasforms it to another object, based on the resolved instance
 */
export function Transform<T, M>(token: Token<T>, transform: (target: T) => M, ...args: any[]): M {
  return transform(Resolve(token, ...args));
}

/**
 *  A class decorator that registers designated class as an resolvable dependency.
 */
export function Resolvable<D>(resolver?: Resolver<D>) {
  return <T extends D>(target: Constructable<T>) => {
    const resolve = (resolver as Resolver<T>) || ((...args: any[]) => new target(...args));
    RegisterResolver(target, resolve);
  };
}

/**
 * A class decorator that registers designated class as an injectable singleton.
 * Provided constructor will be called first time the dependency accessed and
 * constructed instance will be returned on any subsequent resolution.
 */
export function Singleton<S>(resolver?: Resolver<S>) {
  return <T extends S>(target: Constructable<T>) => {
    RegisterSingleton(
      target,
      (resolver as Resolver<T>) || ((...args: any[]) => new target(...args))
    );
  };
}

function defineDynamicProperty<T>(target: any, property: PropertyKey, resolver: () => T) {
  Object.defineProperty(target, property, {
    get: resolver,
    enumerable: true,
    configurable: true
  });
}

/**
 * A property decorator that resolves and injects the resolved instance
 * of specified dependency to designated property each time the property is
 * accessed. Optional list of arguments could be passed to the resolver.
 * When a function passed as an argument, it will be treated as a lazy argument
 * resolver and will be automatically resolved upon injection.
 *
 * @param token A class or a string token.
 * @param args A list of the arguments to be passed to the resolver.
 */
export function Dynamic<T>(token: Token<T>, ...args: any[]) {
  return function(target: any, property: string | symbol) {
    defineDynamicProperty(target, property, () => Resolve(token, ...args));
  };
}

/**
 * A property decorator that resolves instance of specified dependency
 * and injects mapped object to designated property each time the property is
 * accessed. Optional list of arguments could be passed to the resolver.
 * When a function passed as an argument, it will treated as a lazy argument
 * resolver and will be automatically resolved upon injection.
 *
 *
 * @param token A class or a string token.
 * @param transform A function that transforms the injected instance to another object
 * @param args A list the of arguments to be passed to the resolver.
 */
export function DynamicMap<T, M>(
  token: Constructable<T> | string,
  map: (target: T) => M,
  ...args: any[]
) {
  return function(target: any, property: PropertyKey): void {
    defineDynamicProperty(target, property, () => Transform(token, map, ...args));
  };
}

function defineLazyProperty<T>(target: any, property: PropertyKey, resolver: () => T) {
  Object.defineProperty(target, property, {
    get: () => {
      const instance = resolver();
      Object.defineProperty(target, property, {
        value: instance,
        enumerable: true,
        configurable: true
      });
      return instance;
    },
    enumerable: true,
    configurable: true
  });
}

/**
 * A property decorator that resolves the instance of specified dependency
 * only once and provides the resolved instance as a value of designated property.
 * Optional list of arguments could be passed to the resolver. When a function
 * passed as an argument, it will treated as a lazy argument resolver and will be
 * automatically resolved upon injection.
 *
 * @param token A class or a string token.
 * @param args A list of the arguments to be passed to the resolver.
 */
export function Lazy<T>(token: Token<T>, ...args: any[]) {
  return function(target: any, property: PropertyKey, _index?: number): void {
    defineLazyProperty(target, property, () => Resolve(token, ...args));
  };
}

/**
 * A property decorator that resolves instance of specified dependency
 * and injects mapped object to designated property only once when the property
 * is accessed the first time. Optional list of arguments could be passed to the
 * resolver. When a function passed as an argument, it will treated as a lazy
 * argument resolver and will be automatically resolved upon injection.
 *
 * @param token A class or a string token.
 * @param transform A function that transforms the injected instance to another object
 * @param args A list of the arguments to be passed to the resolver.
 */
export function LazyMap<T, M>(
  token: Constructable<T> | string,
  map: (target: T) => M,
  ...args: any[]
) {
  return function(target: any, property: string | symbol): void {
    defineLazyProperty(target, property, () => Transform(token, map, ...args));
  };
}
