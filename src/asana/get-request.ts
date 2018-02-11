import asanaRequest from "./request";

export default async function getRequest<ResponseType>(uri: string): Promise<ResponseType | null> {
    return asanaRequest<ResponseType>({
        uri
    });
}
