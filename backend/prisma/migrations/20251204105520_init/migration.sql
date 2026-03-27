-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "GSTIN" TEXT NOT NULL,
    "PrimaryContactName" TEXT NOT NULL,
    "PrimaryContactPhone" TEXT NOT NULL,
    "PrimaryContactEmail" TEXT NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "businessId" INTEGER NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "GSTIN" TEXT NOT NULL,
    "FSSAI" TEXT NOT NULL,
    "PrimaryContactName" TEXT NOT NULL,
    "PrimaryContactPhone" TEXT NOT NULL,
    "brandId" INTEGER NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantPricingPlan" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" INTEGER NOT NULL,
    "pricingPlanId" INTEGER NOT NULL,
    "cgst" BOOLEAN NOT NULL DEFAULT false,
    "sgst" BOOLEAN NOT NULL DEFAULT false,
    "igst" BOOLEAN NOT NULL DEFAULT false,
    "addLut" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planMode" TEXT NOT NULL,
    "trialDays" INTEGER,

    CONSTRAINT "RestaurantPricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" INTEGER NOT NULL,
    "pricingPlanId" INTEGER NOT NULL,
    "subTotalAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "partialAmount" DOUBLE PRECISION,
    "remainingAmount" DOUBLE PRECISION,
    "paidAmount" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "proformaNumber" TEXT,
    "invoiceNumber" TEXT,
    "paymentDate" TIMESTAMP(3),
    "paymentNotes" TEXT,
    "isPartialPayment" BOOLEAN NOT NULL DEFAULT false,
    "paymentFileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPlan" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planType" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "description" TEXT,
    "fixedPrice" DOUBLE PRECISION,
    "basePrice" DOUBLE PRECISION,
    "pricePerCredit" DOUBLE PRECISION,
    "creditsIncluded" DOUBLE PRECISION,
    "billingCycle" INTEGER,
    "validity" INTEGER,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedPlan" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DOUBLE PRECISION NOT NULL,
    "billingCycle" INTEGER NOT NULL,

    CONSTRAINT "FixedPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeteredPlan" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DOUBLE PRECISION NOT NULL,
    "creditsIncluded" INTEGER NOT NULL,
    "billingCycle" INTEGER NOT NULL,

    CONSTRAINT "MeteredPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "license" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeteredProduct" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "credits" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MeteredProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncludedProduct" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "IncludedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HybridProduct" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unlimitedUsage" BOOLEAN,
    "numberOfUnits" DOUBLE PRECISION,
    "creditsPerUnit" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HybridProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantPricingPlan_restaurantId_pricingPlanId_key" ON "RestaurantPricingPlan"("restaurantId", "pricingPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PricingPlan_planName_key" ON "PricingPlan"("planName");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_name_ci_unique" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MeteredProduct_planId_productId_key" ON "MeteredProduct"("planId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "IncludedProduct_planId_productId_key" ON "IncludedProduct"("planId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "HybridProduct_planId_productId_key" ON "HybridProduct"("planId", "productId");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantPricingPlan" ADD CONSTRAINT "RestaurantPricingPlan_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantPricingPlan" ADD CONSTRAINT "RestaurantPricingPlan_pricingPlanId_fkey" FOREIGN KEY ("pricingPlanId") REFERENCES "PricingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_pricingPlanId_fkey" FOREIGN KEY ("pricingPlanId") REFERENCES "PricingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeteredProduct" ADD CONSTRAINT "MeteredProduct_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeteredProduct" ADD CONSTRAINT "MeteredProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncludedProduct" ADD CONSTRAINT "IncludedProduct_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncludedProduct" ADD CONSTRAINT "IncludedProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridProduct" ADD CONSTRAINT "HybridProduct_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridProduct" ADD CONSTRAINT "HybridProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
