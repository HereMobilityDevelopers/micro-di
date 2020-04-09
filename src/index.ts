/**
 * A generic resolver type
 */
export type Resolver<T> = (...args: any[]) => T;

export type Token<T> = Constructible<T> | string | symbol;

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

function resolveOnce<T, R>(token: Token<T>, resolve: Resolver<R>) {
  return (...args: any[]) => {
    const instance = resolve(...args);
    OverrideResolver(token, () => instance);
    return instance;
  };
}

/**
 *  An interface wrapper for constructable type
 */
export interface Constructible<T> {
  new (...args: any[]): T;
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
 * @deprecated Will be deleted in the next version. Use 'Resolve' instead.
 */
export function ResolveDependency<T>(token: Token<T>, ...args: any[]) {
  return Resolve(token, ...args);
}

/**
 *  A class decorator that registers designated class as an injectable dependency.
 */
export function Dependency<D>(resolver?: Resolver<D>) {
  return <T extends D>(target: Constructible<T>) => {
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
  return <T extends S>(target: Constructible<T>) => {
    RegisterSingleton(
      target,
      (resolver as Resolver<T>) || ((...args: any[]) => new target(...args))
    );
  };
}

function resolveArguments(args: any[]): any[] {
  return args.map(arg => (arg instanceof Function ? arg() : arg));
}

/**
 * A property decorator that resolves and injects the resolved instance
 * of specified dependency to designated property. Optional list of arguments
 * could be passed to the resolver. When a function passed as an argument, it
 * will treated as a lazy argument resolver and will be automatically resolved
 * upon injection.
 *
 * @param token A class or a string token.
 * @param args A list of arguments to be passed to resolver.
 */
export function Inject<T>(token: Token<T>, ...args: any[]) {
  return (target: Object, property: string | symbol) => {
    Object.defineProperty(target, property, {
      get: () => Resolve(token, ...resolveArguments(args)),
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * A property decorator that resolves instance of specified dependency
 * and injects mapped object to designated property. Optional list of arguments
 * could be passed to the resolver. When a function passed as an argument, it
 * will treated as a lazy argument resolver and will be automatically resolved
 * upon injection.
 *
 *
 * @param token A class or a string token.
 * @param transform A function that transforms the injected instance to another object
 * @param args A list of arguments to be passed to resolver.
 */
export function MapInject<T, R>(
  token: Constructible<T> | string,
  transform: (target: T) => R,
  ...args: any[]
) {
  return (target: Object, property: string | symbol) => {
    Object.defineProperty(target, property, {
      get: () => transform(Resolve(token, ...resolveArguments(args))),
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * @deprecated Will be deleted in the next version. Use 'MapInject' instead.
 */
export function Transform<T>(
  token: Constructible<T> | string,
  transform: (dependency: T) => any,
  ...args: any[]
) {
  return MapInject(token, transform, ...args);
}
