import {
  Resolvable,
  Dynamic,
  RegisterResolver,
  Resolve,
  Singleton,
  DynamicMap,
  Lazy,
  LazyMap
} from "../src";

describe("MicroDI", () => {
  describe("@Singleton", () => {
    it("resolves singleton to the same instance each time accessed", () => {
      expect(Resolve(DependencyOne).name).toEqual(`SingletonOne#1`);
      expect(Resolve(DependencyOne).name).toEqual(`SingletonOne#1`);
      expect(DependencyOneCounter).toEqual(1);
      expect(Resolve(DependencyTwo).name).toEqual(`SingletonTwo#1`);
      expect(Resolve(DependencyTwo).name).toEqual(`SingletonTwo#1`);
      expect(DependencyTwoCounter).toEqual(1);
    });
  });

  describe("@Dynamic", () => {
    let subject: DependencyTwo;

    beforeEach(() => {
      subject = Resolve(DependencyTwo);
    });

    it("resolves property value by accessing property getter", () => {
      expect(subject.dependency.name).toEqual(`SingletonOne#1`);
    });

    it("next time property getter resolves to the same instance", () => {
      expect(subject.dependency.name).toEqual(`SingletonOne#1`);
    });

    it("resolves factory dependency to new instance each time when accessing property getter", () => {
      expect(subject.factory.name).toEqual(`Instance#${FactoryCounter}`);
      const firstCounter = FactoryCounter;
      expect(subject.factory.name).toEqual(`Instance#${FactoryCounter}`);
      expect(FactoryCounter).toEqual(firstCounter + 1);
    });
  });

  describe("@Lazy", () => {
    let subject: ConfiguredSubject;
    let expectedName: string;

    beforeAll(() => {
      subject = new ConfiguredSubject();
      expectedName = `Instance#${FactoryCounter + 1}`;
    });

    it("resolves property value by accessing property getter", () => {
      expect(subject.produced.name).toEqual(expectedName);
    });

    it("next time property getter resolves to the same instance", () => {
      expect(subject.produced.name).toEqual(expectedName);
    });
  });

  describe("@DynamicMap", () => {
    let subject: ConfiguredSubject;

    beforeEach(() => {
      subject = new ConfiguredSubject();
    });

    it("maps the resolved instance and injects mapped value", () => {
      expect(subject.mappedName).toEqual(`RegisterClassTest#${FactoryCounter}`);
    });
  });

  describe("@LazyMap", () => {
    let subject: ConfiguredSubject;
    let expectedName: string;

    beforeAll(() => {
      expectedName = `Instance#${FactoryCounter + 1}`;
      subject = new ConfiguredSubject();
    });

    it("maps the resolved instance and injects mapped value", () => {
      expect(subject.lazyMapped).toEqual(expectedName);
    });

    it("returns the same value when accessed next time", () => {
      expect(subject.lazyMapped).toEqual(expectedName);
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
      expect(Resolve<Factory>("RegisterTokenTest").name).toEqual(
        `RegisterTokenTest#${FactoryCounter}`
      );
      const firstCounter = FactoryCounter;
      expect(Resolve<Factory>("RegisterTokenTest").name).toEqual(
        `RegisterTokenTest#${FactoryCounter}`
      );
      expect(FactoryCounter).toEqual(firstCounter + 1);
    });
  });

  describe("RegisterResolver(Resolvable<T>))", () => {
    beforeEach(() => {
      RegisterResolver(
        AnotherFactory,
        () => new AnotherFactory(`RegisterClassTest#${++FactoryCounter}`)
      );
    });

    it("registers resolver correctly under class token", () => {
      expect(Resolve(AnotherFactory).name).toEqual(`RegisterClassTest#${FactoryCounter}`);
      const firstCounter = FactoryCounter;
      expect(Resolve(AnotherFactory).name).toEqual(`RegisterClassTest#${FactoryCounter}`);
      expect(FactoryCounter).toEqual(firstCounter + 1);
    });
  });

  describe("Static and lazy parametrised injection", () => {
    let subject!: ConfiguredSubject;

    beforeEach(() => {
      subject = new ConfiguredSubject();
      externalName = "That name!";
    });

    it("injects new object passing correct params to constructor", () => {
      expect(subject.getName()).toEqual("That subject: That name!");
    });

    it("injects singleton with the arguments passed from the first decorator executed", () => {
      expect(subject.singleton.name).toEqual("Proper Name");
      expect(subject.singleton.label).toEqual("Right Label");
      expect(subject.secondary.name).toEqual("Proper Name");
    });
  });

  describe("Dynamic parametrised resolution", () => {
    let object1!: ConfigurableObject;
    let object2!: ConfigurableObject;

    beforeEach(() => {
      object1 = Resolve("factory", "Test1");
      object2 = Resolve(ConfigurableObject, "Test2");
    });

    it("injects the new object passing correct params to constructor", () => {
      expect(object1.name).toEqual("Test1");
      expect(object2.name).toEqual("Test2");
    });
  });
});

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

@Resolvable(() => new Factory(`Instance#${++FactoryCounter}`))
class Factory {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

@Resolvable(() => new AnotherFactory(`RegisterClassTest#${++FactoryCounter}`))
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

  @Dynamic(DependencyOne)
  dependency!: DependencyOne;

  @Dynamic(Factory)
  factory!: Factory;

  constructor(name: string) {
    this.name = name;
  }
}

@Resolvable()
class ConfigurableObject {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

@Singleton()
class ConfigurableSingleton {
  name: string;
  label: string;

  constructor(name: string, label: string) {
    this.name = name;
    this.label = label;
  }
}

RegisterResolver("factory", (name: string) => new ConfigurableObject(name));

let externalName = "Initial";

class ConfiguredSubject {
  @Dynamic(ConfigurableObject, () => externalName)
  object!: ConfigurableObject;

  @Dynamic(ConfigurableSingleton, "Ignored")
  secondary!: ConfigurableSingleton;

  @Dynamic(ConfigurableSingleton, "Proper Name", "Right Label")
  singleton!: ConfigurableSingleton;

  @Lazy(Factory)
  produced!: Factory;

  @DynamicMap(AnotherFactory, subject => subject.name)
  mappedName!: string;

  @LazyMap(Factory, subject => subject.name)
  lazyMapped!: string;

  getName() {
    return `That subject: ${this.object.name}`;
  }
}
