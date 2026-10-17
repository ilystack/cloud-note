const { withGradleProperties } = require("@expo/config-plugins");
const path = require("path");

module.exports = function withCustomGradleProperties(config) {
  // Ensure expo-sqlite build.gradle uses bundled sqlite amalgamation
  try {
    require(path.join(__dirname, "../scripts/patch-expo-sqlite.js"));
  } catch (err) {
    console.warn("[withCustomGradleProperties] patch-expo-sqlite warning:", err.message);
  }

  return withGradleProperties(config, (config) => {
    const propsToAdd = [
      {
        type: "property",
        key: "systemProp.java.net.preferIPv4Stack",
        value: "true",
      },
      {
        type: "property",
        key: "systemProp.java.net.preferIPv4Addresses",
        value: "true",
      },
      {
        type: "property",
        key: "org.gradle.jvmargs",
        value: "-Xmx4096m -Djava.net.preferIPv4Stack=true -Djava.net.preferIPv4Addresses=true",
      },
    ];

    propsToAdd.forEach((prop) => {
      const existing = config.modResults.find(
        (item) => item.type === "property" && item.key === prop.key
      );
      if (existing) {
        existing.value = prop.value;
      } else {
        config.modResults.push(prop);
      }
    });

    return config;
  });
};
