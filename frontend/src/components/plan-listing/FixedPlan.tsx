export default function FixedPlanPage({ fixed }: { fixed: any[] }) {

  if (!fixed || fixed.length === 0) {
    return <p className="text-gray-500 text-center">No fixed plans found.</p>;
  }

  return (
    <div className="space-y-8">
      {fixed.map((plan) => (
        <div
          key={plan.id}
          className="bg-white border shadow-md rounded-lg p-6 space-y-6"
        >
          <h2 className="text-xl font-bold text-gray-800">
            Fixed Plan – {plan.planName}
          </h2>

          {/* BASIC DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
            <div>
              <p className="font-semibold">Plan Name</p>
              <p>{plan.planName}</p>
            </div>

            <div>
              <p className="font-semibold">Fixed Price</p>
              <p> {plan.fixedPrice}</p>
            </div>

            <div>
              <p className="font-semibold">Billing Cycle</p>
              <p>{plan.billingCycle ? `${plan.billingCycle} months` : "-"}</p>
            </div>
          </div>

          {/* INCLUDED PRODUCTS */}
          <div>
            <p className="text-lg font-semibold mb-2">Included Products</p>

            {plan.includedProducts?.length ? (
              <div className="space-y-3">
                {plan.includedProducts.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-gray-100 border rounded p-3"
                  >
                    <p className="font-semibold">{p.product.name}</p>
                    {p.product.license && (
                      <p className="text-gray-800">License: {p.product.license}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No included products</p>
            )}
          </div>

        </div>
      ))}
    </div>
  );
}