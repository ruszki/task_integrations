import {Options} from "request";
import Config from "../config/config";
import rp from "request-promise-native";
import getConfig from "../config/config-getter";

let config: Config | null = null;

export default async function asanaRequest(options: Options): Promise<string> {
    if (config === null) {
        config = await getConfig();
    }

    if (config !== null) {
        const authorizationHeader = {
            "Authorization": "Bearer " + config.asana.token
        };

        const usedOptions: Options = {
            ...options,
            headers: options.headers !== undefined ? {
                ...options.headers,
                ...authorizationHeader
            } : authorizationHeader
        };

        return rp(usedOptions);
    } else {
        return Promise.reject("Config can't be loaded");
    }
}
