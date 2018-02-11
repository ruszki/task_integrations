import {WorkspaceDescriptor, TeamDescriptor, ProjectDescriptor} from "../config/model/asana";

interface AsanaFilterConfig {
    baseCacheTime: number;
    workspaces?: Array<WorkspaceDescriptor> | WorkspaceDescriptor;
    teams?: Array<TeamDescriptor> | TeamDescriptor;
    projects?: Array<ProjectDescriptor> | ProjectDescriptor;
}

export default AsanaFilterConfig;
