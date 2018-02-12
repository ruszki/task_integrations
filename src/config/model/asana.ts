import AsanaFilterConfig from "../../asana/filter-config";

interface Asana {
    token: string;
    bitbucket?: AsanaFilter;
}

export interface AsanaFilter {
    workspaces?: Array<WorkspaceDescriptor> | WorkspaceDescriptor;
    teams?: Array<TeamDescriptor> | TeamDescriptor;
    projects?: Array<ProjectDescriptor> | ProjectDescriptor;
}

type WorkspaceDescriptor = number | string;
type TeamDescriptor = number | string;
type ProjectDescriptor = number | string;

export default Asana;
