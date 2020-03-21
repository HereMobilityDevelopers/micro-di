import { Dependency, Inject, RegisterResolver, ResolveDependency, Singleton } from "./micro-di";

let DependencyOneCounter = 0;

@Singleton()
class DependencyOne {
  static counter = 0;

  name: string;

  constructor() {
    this.name = `SingletonOne#${++DependencyOneCounter}`;
  }
}

let FactoryCounter = 0;

@Dependency(() => new Factory(`Instance#${++FactoryCounter}`))
class Factory {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

@Dependency(() => new AnotherFactory(`RegisterClassTest#${++FactoryCounter}`))
class AnotherFactory {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

let DependencyTwoCounter = 0;

@Singleton(() => new DependencyTwo(`SingletonTwo#${++DependencyTwoCounter}`))
class DependencyTwo {
  name: string;

  @Inject(DependencyOne)
  dependency!: DependencyOne;

  @Inject(Factory)
  factory!: Factory;

  constructor(name: string) {
    this.name = name;
  }
}

describe("MicroDI", () => {
  describe("Singleton", () => {
    it("resolves singleton to the same instance each time accessed", () => {
      expect(ResolveDependency(DependencyOne).name).toEqual(`SingletonOne#1`);
      expect(ResolveDependency(DependencyOne).name).toEqual(`SingletonOne#1`);
      expect(DependencyOneCounter).toEqual(1);
      expect(ResolveDependency(DependencyTwo).name).toEqual(`SingletonTwo#1`);
      expect(ResolveDependency(DependencyTwo).name).toEqual(`SingletonTwo#1`);
      expect(DependencyTwoCounter).toEqual(1);
    });
  });

  describe("Inject", () => {
    let subject: DependencyTwo;

    beforeEach(() => {
      subject = ResolveDependency(DependencyTwo);
    });

    it("can resolve singleton dependency by accessing property getter", () => {
      expect(subject.dependency.name).toEqual(`SingletonOne#1`);
    });

    it("next time property getter resolves to the same instance", () => {
      expect(subject.dependency.name).toEqual(`SingletonOne#1`);
    });

    it("successfully injected factory resolver to property getter", () => {
      expect(subject.factory.name).toEqual(`Instance#${FactoryCounter}`);
      const firstCounter = FactoryCounter;
      expect(subject.factory.name).toEqual(`Instance#${FactoryCounter}`);
      expect(FactoryCounter).toEqual(firstCounter + 1);
    });
  });

  describe("RegisterResolver(string))", () => {
    beforeEach(() => {
      RegisterResolver(
        "RegisterTokenTest",
        () => new Factory(`RegisterTokenTest#${++FactoryCounter}`)
      );
    });

    it("registers resolver correctly under string token", () => {
      expect(ResolveDependency<Factory>("RegisterTokenTest").name).toEqual(
        `RegisterTokenTest#${FactoryCounter}`
      );
      const firstCounter = FactoryCounter;
      expect(ResolveDependency<Factory>("RegisterTokenTest").name).toEqual(
        `RegisterTokenTest#${FactoryCounter}`
      );
      expect(FactoryCounter).toEqual(firstCounter + 1);
    });
  });

  describe("RegisterResolver(Dependency<T>))", () => {
    beforeEach(() => {
      RegisterResolver(
        AnotherFactory,
        () => new AnotherFactory(`RegisterClassTest#${++FactoryCounter}`)
      );
    });

    it("registers resolver correctly under class token", () => {
      expect(ResolveDependency(AnotherFactory).name).toEqual(`RegisterClassTest#${FactoryCounter}`);
      const firstCounter = FactoryCounter;
      expect(ResolveDependency(AnotherFactory).name).toEqual(`RegisterClassTest#${FactoryCounter}`);
      expect(FactoryCounter).toEqual(firstCounter + 1);
    });
  });
});
