import getTaskActions, {TaskAction} from "./asana/tasks";
import getConfig from "./config/config-getter";
import Config from "./config/model/config";
import AsanaFilterConfig from "./asana/filter-config";

let asanaBitbucketConfig: AsanaFilterConfig = {
    baseCacheTime: 60
};

async function main() {
    const config: Config = await getConfig();

    asanaBitbucketConfig = {
        ...asanaBitbucketConfig,
        workspaces: config.asana.workspaces,
        teams: config.asana.teams,
        projects: config.asana.projects
    };

    mainLoop();

    setInterval(mainLoop, 30000);
}

async function mainLoop() {
    const taskActions: Array<TaskAction> = await getTaskActions(asanaBitbucketConfig);

    console.log(taskActions);
}

main();
