-- One counter-thesis per author per original thesis.
CREATE UNIQUE INDEX "CounterThesis_thesisId_authorId_key" ON "CounterThesis"("thesisId", "authorId");
