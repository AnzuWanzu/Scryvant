module.exports = {
  parserPreset: {
    parserOpts: {
      // This RegEx strictly enforces your exact format -> [Type]: Details
      headerPattern: /^\[([A-Z][a-z]+)\]:\s(.+)$/,
      headerCorrespondence: ["type", "subject"],
    },
  },
  rules: {
    "type-enum": [2, "always", ["Chore", "Feature", "Fix", "Setup", "Merge"]],

    "type-empty": [2, "never"],

    "subject-empty": [2, "never"],

    "header-max-length": [2, "always", 120],
  },
};
