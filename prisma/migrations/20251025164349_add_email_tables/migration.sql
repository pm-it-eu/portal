-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "emailConfigId" TEXT,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "errorCode" TEXT,
    "stackTrace" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_emailConfigId_fkey" FOREIGN KEY ("emailConfigId") REFERENCES "email_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
