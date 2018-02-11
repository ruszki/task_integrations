import request from "../request";
import {expect} from "chai";
import * as TypeMoq from "typemoq";
import Config from "../../config/model/config";
import rp from "request-promise-native";
import getConfig from "../../config/config-getter";

describe("test", function () {
    let requestPromise: TypeMoq.IMock<typeof rp>;
    let response: string;
    let configGetter: TypeMoq.IMock<typeof getConfig>;
    let config: Config;

    beforeEach(function () {
        response = "PromiseResponse";
        requestPromise = TypeMoq.Mock.ofInstance(rp, TypeMoq.MockBehavior.Strict, false);
        requestPromise.setup(x => x(TypeMoq.It.isAny())).returns(() => Promise.resolve(response) as any);

        config = {
            asana: {
                token: "ASANA_TOKEN"
            }
        };
        configGetter = TypeMoq.Mock.ofInstance(getConfig, TypeMoq.MockBehavior.Strict, false);
        configGetter.setup(x => x()).returns(() => Promise.resolve(config));

        // TODO: find good solution to mock in ts-node
    });
});
