/*
  Warnings:

  - A unique constraint covering the columns `[restaurantId,pricingPlanId]` on the table `RestaurantPricingPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "RestaurantPricingPlan_restaurantId_pricingPlanId_key" ON "RestaurantPricingPlan"("restaurantId", "pricingPlanId");
