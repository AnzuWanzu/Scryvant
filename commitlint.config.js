module.exports = {
  parserPreset: {
    parserOpts: {
      // This RegEx strictly enforces your exact format -> [Type]: Details
      headerPattern: /^\[([A-Z][a-z]+)\]:\s(.+)$/,
      headerCorrespondence: ["type", "subject"],
    },
  },
  rules: {
    // 1. Strictly enforce your custom allowed list of types (Capitalized)
    "type-enum": [2, "always", ["Chore", "Feature", "Fix", "Setup", "Merge"]],

    // 2. Ensure the [Type] section is never left empty
    "type-empty": [2, "never"],

    // 3. Ensure the Details section is never left empty
    "subject-empty": [2, "never"],

    // 4. Enforce a maximum length of 72 characters for the entire commit message
    "header-max-length": [2, "always", 72],
  },
};
