import "reflect-metadata";

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

function GetResolver<T, R>(token: Token<T>): Resolver<R> {
  if (typeof token === "string" || typeof token === "symbol")
    return resolvers[token] as Resolver<R>;
  return token.prototype.$dependencyResolver as Resolver<R>;
}

function SetResolver<T, R>(token: Token<T>, resolver: Resolver<R>) {
  if (typeof token === "string" || typeof token === "symbol") resolvers[token] = resolver;
  else token.prototype.$dependencyResolver = resolver;
}

class Injector<T, M> {
  constructor(public token: Token<T>, public map: ((obj: T) => M) | null, public args: any[]) {}
}

function ReflectMetadataIfNeeded<T>(target: Constructable<T>) {
  if (target.prototype.$dependencyInjectors) return;
  target.prototype.$dependencyInjectors = Reflect.getOwnMetadata("design:paramtypes", target).map(
    (token: any) => new Injector(token, null, [])
  );
}

/**
 *  Registers a resolver associated with the specified class or string token
 */
export function RegisterResolver<T, R>(token: Token<T>, resolver: Resolver<R>) {
  if (!GetResolver(token)) SetResolver(token, resolver);
}

export function OverrideResolver<T, R>(token: Token<T>, resolver: Resolver<R>) {
  SetResolver(token, resolver);
}

function ResolveOnce<T, R>(token: Token<T>, resolve: Resolver<R>) {
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
  if (!GetResolver(token)) {
    SetResolver(token, ResolveOnce(token, resolver));
  }
}

export function OverrideSingleton<T, R>(token: Token<T>, resolver: Resolver<R>) {
  SetResolver(token, ResolveOnce(token, resolver));
}

/**
 *  Resolves an instance associated with specified dependency class or string token
 */
export function Resolve<T>(token: Token<T>, ...args: any[]): T {
  const resolve: Resolver<T> = GetResolver(token);
  if (resolve) return resolve(...args);
  throw Error(`Trying to resolve unregistered token: ${token.toString()}`);
}

/**
 *  Resolves an instance associated with specified dependency class or string token,
 *  and transforms it to another object, based on the resolved instance
 */
export function Transform<T, M>(token: Token<T>, transform: (target: T) => M, ...args: any[]): M {
  return transform(Resolve(token, ...args));
}

/**
 * Constructs an instance of the object by trying to automatically resolve all of the arguments of the constructor
 *
 * @param target A class to be constructed.
 * @param args An optional list of arguments to be passed to the constructor. When no arguments are passed,
 *             all constructor arguments will be automatically resolved.
 */
export function Construct<T>(target: Constructable<T>, ...args: any[]): T {
  if (args.length > 0 || !target.prototype.$dependencyInjectors) return new target(...args);
  let dependencies = target.prototype.$dependencyInjectors.map((injector: Injector<any, any>) => {
    if (injector.map) return Transform(injector.token, injector.map, ...injector.args);
    return Resolve(injector.token, ...injector.args);
  });
  return new target(...dependencies);
}

function ResolveOrConstruct<T, R>(target: Constructable<T>, resolver?: Resolver<R>): Resolver<any> {
  if (resolver) return resolver;
  return (...args: any[]) => Construct(target, ...args);
}

/**
 *  A class decorator that registers designated class as an resolvable dependency.
 */
export function Resolvable<D>(resolver?: Resolver<D>) {
  return function<T extends D>(target: Constructable<T>): void {
    ReflectMetadataIfNeeded(target);
    RegisterResolver(target, ResolveOrConstruct(target, resolver));
  };
}

/**
 * A class decorator that registers designated class as an injectable singleton.
 * Provided constructor will be called first time the dependency accessed and
 * constructed instance will be returned on any subsequent resolution.
 */
export function Singleton<S>(resolver?: Resolver<S>) {
  return function<T extends S>(target: Constructable<T>): void {
    ReflectMetadataIfNeeded(target);
    RegisterSingleton(target, ResolveOrConstruct(target, resolver));
  };
}

function DefineDynamicProperty<T>(target: Object, property: PropertyKey, resolver: () => T) {
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
 * @param token A class, a string or a symbol token.
 * @param args A list of the arguments to be passed to the resolver.
 */
export function Dynamic<T>(token: Token<T>, ...args: any[]): PropertyDecorator {
  return function(target: Object, property: string | symbol): void {
    DefineDynamicProperty(target, property, () => Resolve(token, ...args));
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
 * @param token A class, a string or a symbol token.
 * @param map A function that transforms the injected instance to another object
 * @param args A list the of arguments to be passed to the resolver.
 */
export function DynamicMap<T, M>(
  token: Token<T>,
  map: (target: T) => M,
  ...args: any[]
): PropertyDecorator {
  return function(target: Object, property: PropertyKey): void {
    DefineDynamicProperty(target, property, () => Transform(token, map, ...args));
  };
}

function DefineLazyProperty<T>(target: Object, property: PropertyKey, resolver: () => T) {
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
 * @param token A class, a string or a symbol token.
 * @param args A list of the arguments to be passed to the resolver.
 */
export function Lazy<T>(token: Token<T>, ...args: any[]): PropertyDecorator {
  return function(target: Object, property: PropertyKey, _index?: number): void {
    DefineLazyProperty(target, property, () => Resolve(token, ...args));
  };
}

/**
 * A property decorator that resolves instance of specified dependency
 * and injects mapped object to designated property only once when the property
 * is accessed the first time. Optional list of arguments could be passed to the
 * resolver. When a function passed as an argument, it will treated as a lazy
 * argument resolver and will be automatically resolved upon injection.
 *
 * @param token A class, a string or a symbol token.
 * @param map A function that transforms the injected instance to another object
 * @param args A list of the arguments to be passed to the resolver.
 */
export function LazyMap<T, M>(
  token: Token<T>,
  map: (target: T) => M,
  ...args: any[]
): PropertyDecorator {
  return function(target: Object, property: string | symbol): void {
    DefineLazyProperty(target, property, () => Transform(token, map, ...args));
  };
}

/**
 * A parameter decorator that defines a dependency which will be injected to
 * the argument of the constructor
 *
 * @param token A class, a string or a symbol token.
 * @param args A list of the arguments to be passed to the resolver.
 */
export function Inject<T>(token: Token<T>, ...args: any[]): ParameterDecorator {
  return function<S>(
    target: Constructable<S>,
    _propertyKey: string | symbol,
    parameterIndex: number
  ): void {
    ReflectMetadataIfNeeded(target);
    target.prototype.$dependencyInjectors[parameterIndex] = new Injector(token, null, args);
  };
}

/**
 * A parameter decorator that defines a dependency which will be injected to
 * the argument of the constructor
 *
 * @param token A class, a string or a symbol token.
 * @param map A function that transforms the injected instance to another object
 * @param args A list of the arguments to be passed to the resolver.
 */
export function MapInject<T, M>(
  token: Token<T>,
  map: (target: T) => M,
  ...args: any[]
): ParameterDecorator {
  return function<S>(
    target: Constructable<S>,
    _propertyKey: string | symbol,
    parameterIndex: number
  ): void {
    ReflectMetadataIfNeeded(target);
    target.prototype.$dependencyInjectors[parameterIndex] = new Injector(token, map, args);
  };
}
