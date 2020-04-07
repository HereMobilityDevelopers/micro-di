import {Dependency, Inject, RegisterResolver, ResolveDependency, Singleton, Transform} from "../src";

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

@Dependency()
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
  @Inject(ConfigurableObject, () => externalName)
  object!: ConfigurableObject;

  @Inject(ConfigurableSingleton, "Ignored")
  secondary!: ConfigurableSingleton;

  @Inject(ConfigurableSingleton, "Proper Name", "Right Label")
  singleton!: ConfigurableSingleton;

  @Transform(ConfigurableObject, subject => subject.name, "Transformed!")
  transformed!: string;

  getName() {
    return `That subject: ${this.object.name}`;
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

  describe("Transform", () => {
    let subject: ConfiguredSubject;

    beforeEach(() => {
      subject = new ConfiguredSubject();
    });

    it("transform the resolved instance and injects transformed value", () => {
      expect(subject.transformed).toEqual("Transformed!")
    })
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

  describe("Static and lazy parametrised @Inject", () => {
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

  describe("Dynamic Parametrised Resolve", () => {
    let object1!: ConfigurableObject;
    let object2!: ConfigurableObject;

    beforeEach(() => {
      object1 = ResolveDependency("factory", "Test1");
      object2 = ResolveDependency(ConfigurableObject, "Test2");
    });

    it("injects the new object passing correct params to constructor", () => {
      expect(object1.name).toEqual("Test1");
      expect(object2.name).toEqual("Test2");
    });
  });
});
