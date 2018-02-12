import getTaskActions, {TaskAction} from "./asana/tasks";
import getConfig from "./config/config-getter";
import Config from "./config/model/config";
import AsanaFilterConfig from "./asana/filter-config";
import bitbucketRequest, {bitbucketRawRequest} from "./bitbucket/request";

let asanaBitbucketConfig: AsanaFilterConfig = {
    baseCacheTime: 60
};

async function main() {
    const config: Config = await getConfig();

    const asanaBitbucketFilter = config.asana.bitbucket;

    if (typeof asanaBitbucketFilter !== "undefined") {
        asanaBitbucketConfig = {
            ...asanaBitbucketConfig,
            ...asanaBitbucketFilter
        };
    }

    if (typeof config.bitbucket.users === "string") {
        const managedIssues: Array<{
            issue: number,
            asanaId: number
        }> = [];
        let nextRepository: string | null = null;
        const ownerId: string = config.bitbucket.users;

        do {
            let repositories: any;

            if (nextRepository === null) {
                repositories = await bitbucketRequest({
                    uri: "repositories/" + ownerId
                });
            } else {
                repositories = await bitbucketRawRequest({
                    uri: nextRepository
                });
            }

            nextRepository = typeof repositories.next === "undefined" ? null : repositories.next;

            for (let repository of repositories.values) {
                const repositoryId: string = repository.uuid;

                let nextIssues: string | null = null;

                do {
                    try {
                        let issues: any;

                        if (nextIssues === null) {
                            issues = await bitbucketRequest({
                                uri: "repositories/" + ownerId + "/" + repositoryId + "/issues"
                            });
                        } else {
                            issues = await bitbucketRawRequest({
                                uri: nextIssues
                            });
                        }

                        nextIssues = typeof issues.next === "undefined" ? null : issues.next;

                        for (let issue of issues.values) {
                            const issueId: number = issue.id;

                            let nextComments: string | null = null;

                            if (issue.content.raw !== null) {
                                const asanaMatch: RegExpMatchArray | null = issue.content.raw.match(/\[\/\/\]: # \(asana_id: ([0-9]+)\)/);

                                if (asanaMatch !== null) {
                                    managedIssues.push({
                                        issue: issueId,
                                        asanaId: parseInt(asanaMatch[1])
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        if (error.statusCode !== 404) {
                            throw error;
                        }
                    }
                } while (nextIssues !== null);
            }
        } while (nextRepository !== null);

        console.log(managedIssues);
    }

    // mainLoop();

    // setInterval(mainLoop, 30000);
}

async function mainLoop() {
    const taskActions: Array<TaskAction> = await getTaskActions(asanaBitbucketConfig);

    console.log(taskActions);
}

main();
