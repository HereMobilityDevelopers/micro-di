/**
 * A generic resolver type
 */
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
export function RegisterResolver<T>(token: Constructible<T> | string, resolver: Resolver<T>) {
  if (!getResolver(token)) setResolver(token, resolver);
}

export function OverrideResolver<T, R>(token: Constructible<T> | string, resolver: Resolver<R>) {
  setResolver(token, resolver);
}

/**
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

/**
 *  Resolves an instance associated with specified dependency class or string token
 */
export function ResolveDependency<T>(token: Constructible<T> | string, ...args: any[]) {
  const resolve: Resolver<T> = getResolver(token);
  if (resolve) return resolve(...args);
  throw Error(`Trying to resolve unregistered token: ${token}`);
}

/**
 *  A class decorator that registers designated class as an injectable dependency.
 */
export function Dependency(resolver?: Resolver<any>) {
  return function <T>(target: Constructible<T>) {
    RegisterResolver(target, resolver || ((...args: any[]) => new target(...args)));
  };
}

/**
 * A class decorator that registers designated class as an injectable singleton.
 * Provided constructor will be called first time the dependency accessed and
 * constructed instance will be returned on any subsequent resolution.
 */
export function Singleton(resolver?: Resolver<any>) {
  return function<T>(target: Constructible<T>) {
    RegisterSingleton(target, resolver || ((...args: any[]) => new target(...args)));
  };
}

function resolveArguments(args: any[]): any[] {
  return (args.map(arg => arg instanceof Function ? arg() : arg))
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
export function Inject<T>(token: Constructible<T> | string, ...args: any[]): PropertyDecorator {
  return (target: Object, property: string | symbol) => {
    Object.defineProperty(target, property, {
      get: () => ResolveDependency(token, ...resolveArguments(args)),
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * A property decorator that resolves instance of specified dependency
 * and injects transformed object to designated property. Optional list of arguments
 * could be passed to the resolver. When a function passed as an argument, it
 * will treated as a lazy argument resolver and will be automatically resolved
 * upon injection.
 *
 *
 * @param token A class or a string token.
 * @param transform A function that transforms the injected instance to another object
 * @param args A list of arguments to be passed to resolver.
 */
export function Transform<T>(
    token: Constructible<T> | string,
    transform: (dependency: T) => any,
    ...args: any[]) {
  return (target: Object, property: string | symbol) => {
    Object.defineProperty(target, property, {
      get: () => transform(ResolveDependency(token, ...resolveArguments(args))),
      enumerable: true,
      configurable: true
    });
  };
}
