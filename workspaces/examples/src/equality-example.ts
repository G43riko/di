import { Injectable, RootInjector } from "@g43/di";

@Injectable()
class ServiceA {
}

const a = RootInjector.get(ServiceA);
console.log("##################");
const b = RootInjector.get(ServiceA);

console.log(a === b);
