import { createApiFromDefinitions } from "../runtime/createApi";
import { definitions } from "./api-definitions.js";
export const Api = createApiFromDefinitions(definitions);
