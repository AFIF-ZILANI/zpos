-- CreateIndex
CREATE INDEX "payments_method_idx" ON "payments"("method");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

-- CreateIndex
CREATE INDEX "payments_method_status_idx" ON "payments"("method", "status");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "payments_method_created_at_idx" ON "payments"("method", "created_at");

-- CreateIndex
CREATE INDEX "purchase_items_purchase_id_variant_id_idx" ON "purchase_items"("purchase_id", "variant_id");

-- CreateIndex
CREATE INDEX "purchases_invoice_no_idx" ON "purchases"("invoice_no");

-- CreateIndex
CREATE INDEX "purchases_date_idx" ON "purchases"("date");

-- CreateIndex
CREATE INDEX "purchases_date_invoice_no_idx" ON "purchases"("date", "invoice_no");

-- CreateIndex
CREATE INDEX "sales_status_idx" ON "sales"("status");

-- CreateIndex
CREATE INDEX "sales_invoiced_at_idx" ON "sales"("invoiced_at");

-- CreateIndex
CREATE INDEX "sales_invoice_number_idx" ON "sales"("invoice_number");

-- CreateIndex
CREATE INDEX "sales_invoiced_at_status_idx" ON "sales"("invoiced_at", "status");
