export default function HybridPlanPage({ hybrid }: { hybrid: any[] }) {
  if (!hybrid || hybrid.length === 0) {
    return <p className="text-gray-500 text-center">No hybrid plans found.</p>;
  }

  return (
    <div className="space-y-8">
      {hybrid.map((plan) => (
        <div
          key={plan.id}
          className="bg-white border shadow-md rounded-lg p-6 space-y-6"
        >
          <h2 className="text-xl font-bold text-gray-800">
            Hybrid Plan – {plan.planName}
          </h2>

          {/* BASIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">

            <div>
              <p className="font-semibold">Base Price</p>
              <p>{plan.basePrice ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Price per Credit</p>
              <p>{plan.pricePerCredit ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Validity</p>
              <p>{plan.validity ? `${plan.validity} months` : "-"}</p>
            </div>
          </div>

          {/* HYBRID Products */}
          <div>
            <p className="text-lg font-semibold mb-2">Products & Usage</p>

            {plan.hybridProducts?.length ? (
              <div className="space-y-3">
                {plan.hybridProducts.map((hp: any) => (
                  <div
                    key={hp.id ?? hp.productId}
                    className="bg-gray-50 border rounded-lg p-3 shadow-sm"
                  >
                    <p className="font-semibold">{hp.product?.name}</p>

                    <p className="text-sm text-gray-600 mt-1">
                      Usage Type:{" "}
                      <span className="font-medium text-gray-800">
                        {hp.unlimited ? "Unlimited" : "Limited"}
                      </span>
                    </p>

                    {/* LIMITED fields */}
                    {!hp.unlimited && (
                      <div className="grid grid-cols-2 gap-3 mt-2 text-sm text-gray-700">
                        <div>
                          <span className="font-medium">Included Units:</span>{" "}
                          {hp.numberOfUnits ?? "-"}
                        </div>
                        <div>
                          <span className="font-medium">Credits Per Unit:</span>{" "}
                          {hp.creditsPerUnit ?? "-"}
                        </div>
                      </div>
                    )}

                    {/* License if exists */}
                    {hp.product?.license && (
                      <p className="text-xs text-gray-500 mt-2">
                        License: {hp.product.license}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No hybrid products</p>
            )}
          </div>

        </div>
      ))}
    </div>
  );
}