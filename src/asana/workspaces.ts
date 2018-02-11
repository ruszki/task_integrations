import Config from "../config/model/config";
import getConfig from "../config/config-getter";
import getRequest from "./get-request";
import AsanaFilterConfig from "./filter-config";

export default async function getWorkspaces(config: AsanaFilterConfig): Promise<Array<number>> {
    const cachedWorkspaceIds: WorkspacesCache | undefined = cacheWorkspaces.get(config);

    if (typeof cachedWorkspaceIds !== "undefined" && cachedWorkspaceIds.valid) {
        return cachedWorkspaceIds.value;
    } else {
        const workspaces: WorkspacesResponse | null = await getRequest<WorkspacesResponse>("workspaces");
        const workspaceIds: Array<number> = [];

        if (workspaces === null) {
            if (typeof cachedWorkspaceIds !== "undefined") {
                return cachedWorkspaceIds.value;
            } else {
                return workspaceIds;
            }
        } else if (typeof config.workspaces !== "undefined") {
            if (Array.isArray(config.workspaces)) {
                config.workspaces.forEach((workspace: number | string) => {
                    if (typeof workspace === "number") {
                        workspaceIds.push(workspace);
                    } else {
                        const id: number | null = searchWorkspaceByName(workspaces, workspace);

                        if (id !== null) {
                            workspaceIds.push(id);
                        }
                    }
                });
            } else if (typeof config.workspaces === "number") {
                workspaceIds.push(config.workspaces);
            } else {
                const id: number | null = searchWorkspaceByName(workspaces, config.workspaces);

                if (id !== null) {
                    workspaceIds.push(id);
                }
            }
        } else {
            workspaces.data.forEach((workspace: WorkspaceResponse) => {
                workspaceIds.push(workspace.id);
            });
        }

        cacheWorkspaces.set(config, {
            value: workspaceIds,
            valid: true
        });

        setTimeout(() => {
            const cacheWorkspaceIds: WorkspacesCache | undefined = cacheWorkspaces.get(config);

            if (typeof cacheWorkspaceIds !== "undefined") {
                cacheWorkspaceIds.valid = false;
            }
        }, config.baseCacheTime * 60);

        return workspaceIds;
    }
}

const cacheWorkspaces: Map<AsanaFilterConfig, WorkspacesCache> = new Map<AsanaFilterConfig, WorkspacesCache>();

interface WorkspacesCache {
    value: Array<number>;
    valid: boolean;
}

interface WorkspaceResponse {
    id: number;
    name: string;
}

interface WorkspacesResponse {
    data: Array<WorkspaceResponse>;
}

function searchWorkspaceByName(response: WorkspacesResponse, name: string): number | null {
    let id: number | null = null;

    for (let workspace of response.data) {
        if (workspace.name === name) {
            id = workspace.id;

            break;
        }
    }

    if (id === null) {
        console.warn("Workspace not found: " + name);
    }

    return id;
}
