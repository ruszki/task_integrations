import {OptionsWithUri} from "request";
import Config from "../config/model/config";
import rp from "request-promise-native";
import getConfig from "../config/config-getter";

let config: Config | null = null;
let enableRequest: boolean = true;

export default async function asanaRequest<ResponseType>(options: OptionsWithUri): Promise<ResponseType | null> {
    if (enableRequest) {
        if (config === null) {
            config = await getConfig();
        }

        if (config !== null) {
            const authorizationHeader = {
                "Authorization": "Bearer " + config.asana.token
            };

            const usedOptions: OptionsWithUri = {
                ...options,
                uri: "https://app.asana.com/api/1.0/" + options.uri,
                headers: typeof options.headers !== "undefined" ? {
                    ...options.headers,
                    ...authorizationHeader
                } : authorizationHeader,
                json: true
            };

            try {
                const response: ResponseType = await rp(usedOptions);

                return response;
            } catch (error) {
                if (error.statusCode === 429) {
                    if (typeof error.response !== "undefined") {
                        const retryAfterHeader: string | undefined = error.response.headers["Retry-After"];

                        if (typeof retryAfterHeader !== "undefined") {
                            const retryAfter = parseInt(retryAfterHeader);

                            enableRequest = false;

                            console.log("Pause with requests for " + retryAfter + " s");

                            setTimeout(() => enableRequest = true, retryAfter * 1000);
                        }
                    }

                    return null;
                } else {
                    throw error;
                }
            }
        } else {
            throw "Config can't be loaded";
        }
    } else {
        return null;
    }
}
