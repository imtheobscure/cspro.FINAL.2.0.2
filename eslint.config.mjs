import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: { globals: {...globals.browser} },
    rules: {
      "no-undef": "error"
    }
  },
  pluginJs.configs.recommended,
];
