import { createInjector, Injectable } from "@g43/di";

@Injectable()
class DepA {
    public readonly key = "PARAMS"
}
class DepB {
    public readonly key = "AAAA"
}
const injector = createInjector({
    providers: [
        {
            token: "CUSTOM_TOKEN_VALUE",
            useValue: "CUSTOM_VALUE"
        },
        {
            token: "CUSTOM_CLASS_VALUE",
            useClass: DepB,
        },
        {
            token: "CUSTOM_TOKEN_FACTORY_NO_PARAMS",
            factory() {
                return "FACTORY_VALUE_NO_PARAMS"
            },
        },
        {
            token: "CUSTOM_TOKEN_FACTORY_PARAMS",
            deps: [DepA],
            factory(a: DepA) {
                return "FACTORY_VALUE_" + a.key
            },
        },
    ]
})