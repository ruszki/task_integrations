import {promisify} from "util";
import fs from "fs";

export const readFileAsync = promisify(fs.readFile);
