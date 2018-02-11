import Config from "../config/model/config";
import getConfig from "../config/config-getter";
import getRequest from "./get-request";
import getTeams from "./teams";
import AsanaFilterConfig from "./filter-config";

export default async function getProjects(config: AsanaFilterConfig): Promise<Array<number>> {
    const teams: Array<number> = await getTeams(config);

    const teamsHash: string = teams.join("-");
    const cacheProjectIds: ProjectsCache | undefined = cacheProjects.get(teamsHash);

    if (typeof cacheProjectIds !== "undefined" && cacheProjectIds.valid) {
        return cacheProjectIds.value;
    } else {
        const projectIds: Array<number> = [];
        let tryFromCache: boolean = false;

        const requestPromises: Array<Promise<void>> = teams.map(async function (team: number) {
            const teamProjectIds: Array<number> | null = await getProjectsForTeam(config, team);

            if (teamProjectIds === null) {
                tryFromCache = true;
            } else {
                teamProjectIds.forEach((projectId: number) => projectIds.push(projectId));
            }
        });

        await Promise.all(requestPromises);

        if (tryFromCache) {
            if (typeof cacheProjectIds !== "undefined") {
                return cacheProjectIds.value;
            } else {
                return projectIds;
            }
        } else {
            cacheProjects.set(teamsHash, {
                value: projectIds,
                valid: true
            });

            setTimeout(() => {
                const cacheProjectIds: ProjectsCache | undefined = cacheProjects.get(teamsHash);

                if (typeof cacheProjectIds !== "undefined") {
                    cacheProjectIds.valid = false;
                }
            }, config.baseCacheTime * 10);

            return projectIds;
        }
    }
}

async function getProjectsForTeam(config: AsanaFilterConfig, team: number): Promise<Array<number> | null> {
    try {
        const projects: ProjectsResponse | null = await getRequest<ProjectsResponse>("teams/" + team + "/projects");

        const projectIds: Array<number> = [];

        if (projects === null) {
            return null;
        } else if (typeof config.projects !== "undefined") {
            if (Array.isArray(config.projects)) {
                config.projects.forEach((project: number | string) => {
                    if (typeof project === "number") {
                        projectIds.push(project);
                    } else {
                        const id: number | null = searchProjectByName(projects, project);

                        if (id !== null) {
                            projectIds.push(id);
                        }
                    }
                });
            } else if (typeof config.projects === "number") {
                projectIds.push(config.projects);
            } else {
                const id: number | null = searchProjectByName(projects, config.projects);

                if (id !== null) {
                    projectIds.push(id);
                }
            }
        } else {
            projects.data.forEach((project: ProjectResponse) => {
                projectIds.push(project.id);
            });
        }

        return projectIds;
    } catch (error) {
        if (error.statusCode === 404) {
            return [];
        } else {
            throw error;
        }
    }
}

function searchProjectByName(response: ProjectsResponse, name: string): number | null {
    let id: number | null = null;

    for (let project of response.data) {
        if (project.name === name) {
            id = project.id;

            break;
        }
    }

    if (id === null) {
        console.warn("Project not found: " + name);
    }

    return id;
}

const cacheProjects: Map<string, ProjectsCache> = new Map<string, ProjectsCache>();

interface ProjectsCache {
    value: Array<number>;
    valid: boolean;
}

interface ProjectResponse {
    id: number;
    name: string;
}

interface ProjectsResponse {
    data: Array<ProjectResponse>;
}
