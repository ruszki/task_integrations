import getRequest from "./get-request";
import {Response} from "request";
import asanaRequest from "./request";
import {Tasks, TaskEvent, TaskEventType} from "./tasks";

export default async function runEventHandlers(projects: Array<number>): Promise<Tasks> {
    const tasks: Tasks = new Map<number, Array<TaskEvent>>();

    const projectsPromises = projects.map(async function (project: number) {
        let eventsHandler: EventsHandler | undefined = eventHandlers.get(project);

        if (typeof eventsHandler === "undefined") {
            eventHandlers.set(project, new EventsHandler(project));

            return;
        } else {
            const projectTasks: Tasks = await eventsHandler.checkTasks();

            projectTasks.forEach((taskEventArray: Array<TaskEvent>, id: number) => {
                const mainTaskEventArray: Array<TaskEvent> | undefined = tasks.get(id);

                if (typeof mainTaskEventArray === "undefined") {
                    tasks.set(id, taskEventArray);
                } else {
                    taskEventArray.forEach((taskEvent: TaskEvent) => mainTaskEventArray.push(taskEvent));

                    mainTaskEventArray.sort((a: TaskEvent, b: TaskEvent) => {
                        if (a.createdAt < b.createdAt) {
                            return -1;
                        } else if (b.createdAt < a.createdAt) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });
                }
            });
        }
    });

    removeUnnecessaryEventHandlers(projects);

    await Promise.all(projectsPromises);

    return tasks;
}

function removeUnnecessaryEventHandlers(projects: Array<number>) {
    const removedProjects: Array<number> = [];

    Array.from(eventHandlers.entries()).forEach((value: [number, EventsHandler]) => {
        const id: number = value[0];

        if (!projects.includes(id)) {
            removedProjects.push(id);
        }
    });

    removedProjects.forEach((project: number) => {
        eventHandlers.delete(project);
    });
}

const eventHandlers: Map<number, EventsHandler> = new Map<number, EventsHandler>();

class EventsHandler {
    private readonly project: number;
    private sync: string | null;

    constructor(project: number) {
        this.project = project;
        this.sync = null;

        this.initSync();
    }

    public async checkTasks(): Promise<Tasks> {
        const events: Array<EventResponse> = await this.syncRequest();

        const tasks: Tasks = new Map<number, Array<TaskEvent>>();

        events
            .sort((a: EventResponse, b: EventResponse): number => {
                const aDate: Date = new Date(a.created_at);
                const bDate: Date = new Date(b.created_at);

                if (aDate < bDate) {
                    return -1;
                } else if (bDate < aDate) {
                    return 1;
                } else {
                    return 0;
                }
            })
            .forEach((event: EventResponse) => {
                const createdAt: Date = new Date(event.created_at);

                if (event.type === "task") {
                    const id: number = event.resource.id;
                    const taskEventArray: Array<TaskEvent> | undefined = tasks.get(id);

                    switch (event.action) {
                        case "changed":
                            if (typeof taskEventArray === "undefined") {
                                tasks.set(id, [{type: TaskEventType.MODIFIED, createdAt}]);
                            }
                            break;
                        case "deleted":
                            if (typeof taskEventArray === "undefined") {
                                tasks.set(id, [{type: TaskEventType.DELETED, createdAt}]);
                            } else {
                                taskEventArray.push({type: TaskEventType.DELETED, createdAt});
                            }
                            break;
                        case "undeleted":
                            if (typeof taskEventArray === "undefined") {
                                tasks.set(id, [{type: TaskEventType.UNDELETED, createdAt}]);
                            } else {
                                taskEventArray.push({type: TaskEventType.UNDELETED, createdAt});
                            }
                            break;
                        case "removed":
                            if (event.parent !== null && event.parent.id === this.project) {
                                if (typeof taskEventArray !== "undefined") {
                                    taskEventArray.push({type: TaskEventType.MOVED_OUT, createdAt});
                                } else {
                                    tasks.set(id, [{type: TaskEventType.MOVED_OUT, createdAt}]);
                                }
                            }
                            break;
                        case "added":
                            if (typeof taskEventArray === "undefined") {
                                tasks.set(id, [{type: TaskEventType.CREATED_OR_MOVED_IN, createdAt}]);
                            } else {
                                taskEventArray.push({type: TaskEventType.MOVED_IN, createdAt});
                            }
                            break;
                    }
                } else if (event.type === "story" && event.parent !== null) {
                    const id: number = event.parent.id;
                    const taskEventArray: Array<TaskEvent> | undefined = tasks.get(id);

                    switch (event.action) {
                        case "added":
                            if (typeof event.resource.text !== "undefined") {
                                if (event.resource.text === "marked incomplete") {
                                    if (typeof taskEventArray === "undefined") {
                                        tasks.set(id, [{type: TaskEventType.INCOMPLETED, createdAt}]);
                                    } else {
                                        taskEventArray.push({type: TaskEventType.INCOMPLETED, createdAt});
                                    }
                                } else if (event.resource.text === "marked this task complete") {
                                    if (typeof taskEventArray === "undefined") {
                                        tasks.set(id, [{type: TaskEventType.COMPLETED, createdAt}]);
                                    } else {
                                        taskEventArray.push({type: TaskEventType.COMPLETED, createdAt});
                                    }
                                }
                            }
                    }
                }
            });

        return tasks;
    }

    private initSync() {
        this.syncRequest();
    }

    private async syncRequest(): Promise<Array<EventResponse>> {
        try {
            const events: EventsResponse | null = await this.rawSyncRequest();

            if (events === null) {
                return [];
            } else {
                this.sync = events.sync;

                return events.data;
            }
        } catch (error) {
            if (error.statusCode === 412) {
                const events: EventsResponse = error.response.body;
                this.sync = events.sync;

                return [];
            } else if (error.statusCode === 404) {
                return [];
            } else {
                throw error;
            }
        }
    }

    private async rawSyncRequest(): Promise<EventsResponse | null> {
        const syncString: string = this.sync !== null ? "&sync=" + this.sync : "";

        return getRequest<EventsResponse>("events?resource=" + this.project + syncString);
    }
}

interface ResourceResponse {
    id: number;
    text?: string;
}

interface EventResponse {
    type: string;
    action: string;
    resource: ResourceResponse;
    parent: ResourceResponse | null;
    created_at: string;
}

interface EventsResponse {
    data: Array<EventResponse>;
    sync: string;
}
