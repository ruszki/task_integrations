import Config from "../config/model/config";
import getConfig from "../config/config-getter";
import getRequest from "./get-request";
import getWorkspaces from "./workspaces";
import AsanaFilterConfig from "./filter-config";

export default async function getTeams(config: AsanaFilterConfig): Promise<Array<number>> {
    const workspaces: Array<number> = await getWorkspaces(config);

    const workspacesHash: string = workspaces.join("-");
    const cacheTeamIds: TeamsCache | undefined = cacheTeams.get(workspacesHash);

    if (typeof cacheTeamIds !== "undefined" && cacheTeamIds.valid) {
        return cacheTeamIds.value;
    } else {
        const teamIds: Array<number> = [];
        let tryFromCache: boolean = false;

        const requestPromises: Array<Promise<void>> = workspaces.map(async function (workspace: number) {
            const workspaceTeamIds: Array<number> | null = await getTeamsForWorkspace(config, workspace);

            if (workspaceTeamIds === null) {
                tryFromCache = true;
            } else {
                workspaceTeamIds.forEach((teamId: number) => teamIds.push(teamId));
            }
        });

        await Promise.all(requestPromises);

        if (tryFromCache) {
            if (typeof cacheTeamIds !== "undefined") {
                return cacheTeamIds.value;
            } else {
                return teamIds;
            }
        } else {
            cacheTeams.set(workspacesHash, {
                value: teamIds,
                valid: true
            });

            setTimeout(() => {
                const cacheTeamIds: TeamsCache | undefined = cacheTeams.get(workspacesHash);

                if (typeof cacheTeamIds !== "undefined") {
                    cacheTeamIds.valid = false;
                }
            }, config.baseCacheTime * 30);

            return teamIds;
        }
    }
}

async function getTeamsForWorkspace(config: AsanaFilterConfig, workspace: number): Promise<Array<number> | null> {
    try {
        const teams: TeamsResponse | null = await getRequest<TeamsResponse>("organizations/" + workspace + "/teams");

        const teamIds: Array<number> = [];

        if (teams === null) {
            return null;
        } else if (typeof config.teams !== "undefined") {
            if (Array.isArray(config.teams)) {
                config.teams.forEach((team: number | string) => {
                    if (typeof team === "number") {
                        teamIds.push(team);
                    } else {
                        const id: number | null = searchTeamByName(teams, team);

                        if (id !== null) {
                            teamIds.push(id);
                        }
                    }
                });
            } else if (typeof config.teams === "number") {
                teamIds.push(config.teams);
            } else {
                const id: number | null = searchTeamByName(teams, config.teams);

                if (id !== null) {
                    teamIds.push(id);
                }
            }
        } else {
            teams.data.forEach((team: TeamResponse) => {
                teamIds.push(team.id);
            });
        }

        return teamIds;
    } catch (error) {
        if (error.statusCode === 404) {
            return [];
        } else {
            throw error;
        }
    }
}

function searchTeamByName(response: TeamsResponse, name: string): number | null {
    let id: number | null = null;

    for (let team of response.data) {
        if (team.name === name) {
            id = team.id;

            break;
        }
    }

    if (id === null) {
        console.warn("Team not found: " + name);
    }

    return id;
}

const cacheTeams: Map<string, TeamsCache> = new Map<string, TeamsCache>();

interface TeamsCache {
    value: Array<number>;
    valid: boolean;
}

interface TeamResponse {
    id: number;
    name: string;
}

interface TeamsResponse {
    data: Array<TeamResponse>;
}
