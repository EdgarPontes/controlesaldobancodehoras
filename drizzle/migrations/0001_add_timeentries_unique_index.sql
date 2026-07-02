ALTER TABLE "timeEntries"
  ADD CONSTRAINT "timeEntries_userId_date_unique" UNIQUE ("userId", "date");
