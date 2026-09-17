-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "displayName", "email", "id", "passwordHash") SELECT "createdAt", "displayName", "email", "id", "passwordHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- DataFixup: tili(t) jotka olivat olemassa ennen tätä hyväksyntäporttia
-- olivat jo luotettuja, käytössä olevia tilejä — hyväksytään kaikki
-- olemassa olevat rivit, ettei kukaan jo-käyttävä lukkiudu ulos. Uudet
-- käyttäjät saavat edelleen DEFAULT false normaalisti.
UPDATE "User" SET "approved" = true;
