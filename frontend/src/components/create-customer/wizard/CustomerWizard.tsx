"use client";

import { useState } from "react";
import SelectBusiness from "./SelectBusiness";
import SelectBrand from "./SelectBrand";
import CreateStore from "./CreateRestaurant";

export default function CustomerWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<number>(1);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Create Customer (3 steps)</h2>
        <div className="text-sm text-gray-500">Step {step} of 3</div>
      </div>

      {step === 1 && (
        <SelectBusiness
          onSelect={(b: any) => { setSelectedBusiness(b); setStep(2); }}
        />
      )}

      {step === 2 && (
        <SelectBrand
          business={selectedBusiness}
          onBack={() => setStep(1)}
          onSelect={(brand: any) => { setSelectedBrand(brand); setStep(3); }}
        />
      )}

      {step === 3 && (
        <CreateStore
          business={selectedBusiness}
          brand={selectedBrand}
          onBack={() => setStep(2)}
          onDone={() => { setStep(1); setSelectedBusiness(null); setSelectedBrand(null); onDone() }}
        />
      )}
    </div>
  );
}