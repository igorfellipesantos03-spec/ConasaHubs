-- AlterTable
ALTER TABLE "hubs" ADD COLUMN     "costCenterCode" TEXT;

-- AlterTable
ALTER TABLE "link_categories" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "costCenterCode" TEXT,
ADD COLUMN     "costCenterDescription" TEXT,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "roleCode" TEXT,
ADD COLUMN     "roleDescription" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- AddForeignKey
ALTER TABLE "link_categories" ADD CONSTRAINT "link_categories_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

