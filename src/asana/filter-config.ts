import {AsanaFilter} from "../config/model/asana";

type AsanaFilterConfig = AsanaConfig & AsanaFilter;

interface AsanaConfig {
    baseCacheTime: number;
}

export default AsanaFilterConfig;
