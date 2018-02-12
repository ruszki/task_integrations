import oauth2, {OAuthClient, ModuleOptions, Token, AccessToken} from "simple-oauth2";
import {OptionsWithUri} from "request";
import getConfig from "../config/config-getter";
import Config from "../config/model/config";
import rp from "request-promise-native";

let config: Config | null = null;
let oauth2Client: OAuthClient | null = null;
let accessToken: AccessToken | null = null;

export default async function bitbucketRequest<ResponseType>(options: OptionsWithUri): Promise<ResponseType | null> {
    return await bitbucketRawRequest<ResponseType>({
        ...options,
        uri: "https://api.bitbucket.org/2.0/" + options.uri
    });
}

export async function bitbucketRawRequest<ResponseType>(options: OptionsWithUri): Promise<ResponseType | null> {
    if (config === null) {
        config = await getConfig();
    }

    if (config !== null) {
        if (oauth2Client === null) {
            const oauth2Credentials: ModuleOptions = {
                client: {
                    id: config.bitbucket.id,
                    secret: config.bitbucket.secret
                },
                auth: {
                    tokenHost: "https://bitbucket.org",
                    tokenPath: "/site/oauth2/access_token"
                }
            };

            oauth2Client = oauth2.create(oauth2Credentials);
        }

        if (oauth2Client !== null) {
            if (accessToken === null) {
                const token: Token = await oauth2Client.clientCredentials.getToken({});

                accessToken = oauth2Client.accessToken.create(token);
            } else if (accessToken.expired()) {
                accessToken = await accessToken.refresh();
            }

            if (accessToken !== null) {
                const authorizationHeader = {
                    "Authorization": "Bearer " + (accessToken.token as any).access_token
                };

                const usedOptions: OptionsWithUri = {
                    ...options,
                    headers: typeof options.headers !== "undefined" ? {
                        ...options.headers,
                        ...authorizationHeader
                    } : authorizationHeader,
                    json: true
                };

                return await rp(usedOptions);
            }
        }
    }

    return null;
}
