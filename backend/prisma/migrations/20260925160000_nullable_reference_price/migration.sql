-- AlterTable: a draft thesis has no reference price yet — it's set only
-- when the thesis is actually published, from the security's live price
-- at that moment.
ALTER TABLE "Thesis" ALTER COLUMN "referencePrice" DROP NOT NULL;
