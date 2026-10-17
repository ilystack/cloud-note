const fs = require('fs');
const path = require('path');

function patchExpoSqlite() {
  const possiblePaths = [
    path.resolve(__dirname, '../../node_modules/expo-sqlite/android/build.gradle'),
    path.resolve(__dirname, '../node_modules/expo-sqlite/android/build.gradle'),
    path.resolve(process.cwd(), 'node_modules/expo-sqlite/android/build.gradle'),
    path.resolve(process.cwd(), '../../node_modules/expo-sqlite/android/build.gradle'),
  ];

  let targetPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }

  if (!targetPath) {
    console.log('[patch-expo-sqlite] expo-sqlite build.gradle not found, skipping patch.');
    return;
  }

  let content = fs.readFileSync(targetPath, 'utf8');

  if (content.includes('// BUNDLED_SQLITE_PATCH_APPLIED')) {
    console.log('[patch-expo-sqlite] Already patched.');
    return;
  }

  const targetSnippet = `def createNativeDepsDirectories = tasks.register('createNativeDepsDirectories') {
  downloadsDir.mkdirs()
  SQLITE3_SRC_DIR.mkdirs()
}

def downloadSQLite = tasks.register('downloadSQLite', Download) {
  dependsOn(createNativeDepsDirectories)
  src("https://www.sqlite.org/2024/sqlite-amalgamation-\${SQLITE_VERSION}.zip")
  onlyIfNewer(true)
  overwrite(false)
  dest(new File(downloadsDir, "sqlite-amalgamation-\${SQLITE_VERSION}.zip"))
}`;

  const replacementSnippet = `// BUNDLED_SQLITE_PATCH_APPLIED
def createNativeDepsDirectories = tasks.register('createNativeDepsDirectories') {
  downloadsDir.mkdirs()
  SQLITE3_SRC_DIR.mkdirs()
  doLast {
    def destZip = new File(downloadsDir, "sqlite-amalgamation-\${SQLITE_VERSION}.zip")
    if (!destZip.exists()) {
      def candidateDirs = [
        new File(projectDir, "../../../vendor/sqlite"),
        new File(projectDir, "../../../../vendor/sqlite"),
        new File(projectDir, "../../../apps/mobile/vendor/sqlite"),
        new File(projectDir, "../../../../apps/mobile/vendor/sqlite"),
        new File(rootProject.projectDir, "../vendor/sqlite"),
        new File(rootProject.projectDir, "../../vendor/sqlite"),
        new File(rootProject.projectDir, "vendor/sqlite"),
        new File(rootProject.projectDir, "../apps/mobile/vendor/sqlite"),
        new File(rootProject.projectDir, "../../apps/mobile/vendor/sqlite")
      ]
      for (candidate in candidateDirs) {
        def candidateZip = new File(candidate, "sqlite-amalgamation-\${SQLITE_VERSION}.zip")
        if (candidateZip.exists()) {
          println "[expo-sqlite] Using bundled SQLite amalgamation from: \${candidateZip.absolutePath}"
          java.nio.file.Files.copy(candidateZip.toPath(), destZip.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING)
          break
        }
      }
    }
  }
}

def downloadSQLite = tasks.register('downloadSQLite', Download) {
  dependsOn(createNativeDepsDirectories)
  onlyIf {
    def destZip = new File(downloadsDir, "sqlite-amalgamation-\${SQLITE_VERSION}.zip")
    return !destZip.exists()
  }
  src("https://www.sqlite.org/2024/sqlite-amalgamation-\${SQLITE_VERSION}.zip")
  onlyIfNewer(true)
  overwrite(false)
  dest(new File(downloadsDir, "sqlite-amalgamation-\${SQLITE_VERSION}.zip"))
}`;

  if (content.includes(targetSnippet)) {
    content = content.replace(targetSnippet, replacementSnippet);
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log(`[patch-expo-sqlite] Successfully patched ${targetPath}`);
  } else {
    console.warn('[patch-expo-sqlite] Target snippet not found in build.gradle, check version.');
  }
}

patchExpoSqlite();
