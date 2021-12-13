import type { Config } from "@jest/types";

import defaultConfig from "./jest.config";

const config: Config.InitialOptions = {
    ...defaultConfig,
    moduleNameMapper: {
        "/src/index$": "<rootDir>/dist/index",
    },
};
export default config;
