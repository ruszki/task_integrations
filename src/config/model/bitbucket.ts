interface Bitbucket {
    id: string;
    secret: string;
    users?: Array<string> | string;
    repositories?: Array<string> | string;
}

export default Bitbucket;
