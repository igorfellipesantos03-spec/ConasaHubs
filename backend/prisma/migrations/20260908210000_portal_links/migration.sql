-- CreateTable
CREATE TABLE "portal_links" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "image" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'Link',
    "color" TEXT NOT NULL DEFAULT '#00A8CC',
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portal_links_active_order_idx" ON "portal_links"("active", "order");

-- AddForeignKey
ALTER TABLE "portal_links" ADD CONSTRAINT "portal_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
