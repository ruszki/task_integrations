import getRequest from "./get-request";
import runEventHandlers from "./events";
import getProjects from "./projects";
import AsanaFilterConfig from "./filter-config";

export default async function getTaskActions(config: AsanaFilterConfig): Promise<Array<TaskAction>> {
    const projects: Array<number> = await getProjects(config);
    const tasks: Tasks = await runEventHandlers(projects);

    const taskActions: Array<TaskAction> = [];

    const tasksPromises = Array.from(tasks.entries()).map(async function (value: [number, Array<TaskEvent>]): Promise<void> {
        const taskEvents: Array<TaskEvent> = value[1];
        const taskId: number = value[0];

        let movedOut = false;
        let movedIn = false;
        let createdOrMovedIn = false;
        let modified = false;
        let completed = false;
        let incompleted = false;
        let deleted = false;
        let undeleted = false;

        for (let taskEvent of taskEvents) {
            switch (taskEvent.type) {
                case TaskEventType.CREATED_OR_MOVED_IN:
                    createdOrMovedIn = true;
                    break;
                case TaskEventType.MOVED_OUT:
                    if (movedIn) {
                        movedIn = false;
                    } else {
                        movedOut = true;
                    }
                    break;
                case TaskEventType.MOVED_IN:
                    if (movedOut) {
                        movedOut = false;
                    } else {
                        movedIn = true;
                    }
                    break;
                case TaskEventType.COMPLETED:
                    if (incompleted) {
                        incompleted = false;
                    } else {
                        completed = true;
                    }
                    break;
                case TaskEventType.INCOMPLETED:
                    if (completed) {
                        completed = false;
                    } else {
                        incompleted = true;
                    }
                    break;
                case TaskEventType.DELETED:
                    if (undeleted) {
                        undeleted = false;
                    } else {
                        deleted = true;
                    }
                    break;
                case TaskEventType.UNDELETED:
                    if (deleted) {
                        deleted = false;
                    } else {
                        undeleted = true;
                    }
                    break;
                case TaskEventType.MODIFIED:
                    modified = true;
                    break;
            }
        }

        let actionType: TaskActionType | null = null;

        if ((createdOrMovedIn || movedIn || undeleted) && !movedOut && !deleted) {
            actionType = TaskActionType.ADD;
        } else if (!createdOrMovedIn && !movedIn && !undeleted) {
            if (movedOut || deleted) {
                actionType = TaskActionType.DELETE;
            } else if (completed) {
                actionType = TaskActionType.MARK_RESOLVED;
            } else if (incompleted) {
                actionType = TaskActionType.UNMARK_RESOLVED;
            } else if (modified) {
                actionType = TaskActionType.MODIFIED;
            }
        }

        if (actionType !== null) {
            try {
                const taskResponse: TaskResponse | null = await getRequest<TaskResponse>("tasks/" + taskId);

                if (taskResponse !== null) {
                    let userResponse: UserResponse | null = null;
                    if (taskResponse.data.assignee !== null) {
                        const userId: number = taskResponse.data.assignee.id;

                        userResponse = await getRequest<UserResponse>("users/" + userId);
                    }

                    let taskAction: TaskAction = {
                        id: taskId,
                        action: actionType,
                        name: taskResponse.data.name,
                        completed: taskResponse.data.completed
                    };

                    if (userResponse !== null) {
                        taskAction = {
                            ...taskAction,
                            assignee: {
                                id: userResponse.data.id,
                                email: userResponse.data.email
                            }
                        };
                    }

                    if (taskResponse.data.due_on !== null) {
                        taskAction = {
                            ...taskAction,
                            due_on: new Date(taskResponse.data.due_on)
                        };
                    }

                    taskActions.push(taskAction);
                }
            } catch (error) {
                if (error.statusCode === 404) {
                    taskActions.push({
                        id: taskId,
                        action: TaskActionType.DELETE,
                        name: "",
                        completed: true
                    });
                } else {
                    throw error;
                }
            }
        }
    });

    return Promise.all(tasksPromises).then(() => taskActions);
}

export type Tasks = Map<number, Array<TaskEvent>>;

export interface TaskEvent {
    type: TaskEventType;
    createdAt: Date;
}

export enum TaskEventType {
    CREATED_OR_MOVED_IN, MODIFIED, MOVED_OUT, MOVED_IN, DELETED, COMPLETED, INCOMPLETED, UNDELETED
}

export interface TaskAction {
    id: number;
    action: TaskActionType;
    assignee?: TaskAssignee;
    name: string;
    due_on?: Date;
    completed: boolean;
}

export enum TaskActionType {
    ADD, DELETE, MARK_RESOLVED, UNMARK_RESOLVED, MODIFIED
}

interface TaskAssignee {
    id: number;
    email: string;
}

interface TaskResponse {
    data: TaskDataResponse;
}

interface TaskDataResponse {
    assignee: AssigneeResponse | null;
    completed: boolean;
    name: string;
    projects: Array<number>;
    due_on: string | null;
}

interface AssigneeResponse {
    id: number;
}

interface UserResponse {
    data: UserDataResponse;
}

interface UserDataResponse {
    id: number;
    email: string;
}
