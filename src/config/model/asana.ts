interface Asana {
    token: string;
    workspaces?: Array<WorkspaceDescriptor> | WorkspaceDescriptor;
    teams?: Array<TeamDescriptor> | TeamDescriptor;
    projects?: Array<ProjectDescriptor> | ProjectDescriptor;
}

export type WorkspaceDescriptor = number | string;
export type TeamDescriptor = number | string;
export type ProjectDescriptor = number | string;

export default Asana;
