import {Options} from "request";
import asanaRequest from "./asana/request";

async function main() {
    const options: Options = {
        uri: "https://app.asana.com/api/1.0/users/me"
    };

    const response: any = await asanaRequest(options);

    console.log("response", response);
}

main();
