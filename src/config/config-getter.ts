import Config from "./model/config";
import {readFileAsync} from "../helpers/promisify";

let config: Config | null = null;

export default async function getConfig(): Promise<Config> {
    if (config === null) {
        try {
            const configContent = await readFileAsync("config.json", "utf8");
            config = JSON.parse(configContent);
        } catch (_) {
            throw "Config file not found!";
        }

        if (config !== null) {
            console.log("Using Asana token: " + config.asana.token);
        }
    }

    if (config !== null) {
        return config;
    } else {
        throw "Config file not found!";
    }
}
