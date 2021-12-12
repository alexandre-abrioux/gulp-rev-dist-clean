import type { Config } from "@jest/types";
import { createJestPreset } from "ts-jest";

const config: Config.InitialOptions = {
    ...createJestPreset(true),
};
export default config;
