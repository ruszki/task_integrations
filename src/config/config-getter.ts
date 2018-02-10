import Config from "./config";
import {readFileAsync} from "../helpers/promisify";

let config: Config | null = null;

export default async function getConfig(): Promise<Config> {
    if (config === null) {
        try {
            const configContent = await readFileAsync("config.json", "utf8");
            config = JSON.parse(configContent);
        } catch (_) {
            return Promise.reject("Config file is not found!");
        }

        if (config !== null) {
            console.log("Using Asana token: " + config.asana.token);
        }
    }

    if (config !== null) {
        return Promise.resolve(config);
    } else {
        return Promise.reject("Config file is not found!");
    }
}
