-- DropForeignKey
ALTER TABLE "test_sessions" DROP CONSTRAINT "test_sessions_userId_fkey";

-- AlterTable
ALTER TABLE "test_sessions" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
