export default function MeteredPlanPage({ metered }: { metered: any[] }) {

  if (!metered || metered.length === 0) {
    return <p className="text-gray-500 text-center">No metered plans found.</p>;
  }

  return (
    <div className="space-y-8">
      {metered.map((plan) => (
        <div
          key={plan.id}
          className="bg-white border shadow-md rounded-lg p-6 space-y-6"
        >
          <h2 className="text-xl font-bold text-gray-800">
            Metered Plan – {plan.planName}
          </h2>

          {/* BASIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
            <div>
              <p className="font-semibold">Base Price</p>
              <p> {plan.basePrice}</p>
            </div>

            <div>
              <p className="font-semibold">Total Credits Included</p>
              <p>{plan.creditsIncluded}</p>
            </div>

            <div>
              <p className="font-semibold">Validity</p>
              <p>{plan.validity ? `${plan.validity} months` : "-"}</p>
            </div>
          </div>

          {/* METERED PRODUCTS */}
          <div>
            <p className="text-lg font-semibold mb-2">Metered Products</p>

            {plan.meteredProducts?.length ? (
              <div className="space-y-3">
                {plan.meteredProducts.map((mp: any) => (
                  <div
                    key={mp.id}
                    className="flex items-center justify-between bg-gray-100 border rounded p-3"
                  >
                    <p className="font-semibold">{mp.product.name}</p>
                    <p className="text-gray-800">Credits: {mp.credits}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No metered products</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}